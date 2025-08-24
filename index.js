import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import { JSDOM } from "jsdom";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// رابط الموقع الأصلي
const TARGET = "http://gaaaagaaa.onlinewebshop.net";

// تعديل الروابط والفورمات في صفحات HTML فقط
async function rewriteHTML(body) {
  const dom = new JSDOM(body);
  const document = dom.window.document;

  // تعديل الفورمات
  document.querySelectorAll("form").forEach(form => {
    const action = form.getAttribute("action");
    if (action && !action.startsWith("http")) {
      form.setAttribute("action", "/api/" + action);
    }
  });

  // تعديل الروابط الداخلية
  document.querySelectorAll("a").forEach(a => {
    const href = a.getAttribute("href");
    if (href && !href.startsWith("http") && !href.startsWith("#")) {
      a.setAttribute("href", "/api/" + href);
    }
  });

  return dom.serialize();
}

// الصفحة الافتراضية
app.get("/", (req, res) => {
  res.send("✅ GoldenStore Proxy running with SSL on Render!");
});

// جميع طلبات /api/*
app.all("/api/*", async (req, res) => {
  try {
    const path = req.originalUrl.replace("/api", "");
    const targetUrl = TARGET + path;

    // تجهيز الطلب
    const fetchOptions = {
      method: req.method,
      headers: { ...req.headers, host: TARGET.replace(/^https?:\/\//, "") },
      redirect: "manual"
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.body && Object.keys(req.body).length > 0) {
        // إذا الفورم يستخدم application/x-www-form-urlencoded
        fetchOptions.body = new URLSearchParams(req.body);
      }
    }

    // جلب البيانات من الموقع الأصلي
    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get("content-type") || "";

    // إذا صفحة HTML ثابتة (غير PHP) → نعدل الروابط والفورمات
    if (contentType.includes("text/html") && !path.endsWith(".php")) {
      const text = await response.text();
      const rewritten = await rewriteHTML(text);
      res.set("Content-Type", "text/html");
      res.send(rewritten);
    } else {
      // أي محتوى آخر أو PHP → نرسله كما هو
      const buffer = await response.arrayBuffer();
      res.set("Content-Type", contentType);
      res.send(Buffer.from(buffer));
    }
  } catch (error) {
    console.error("Proxy Error:", error);
    res.status(500).send("❌ Proxy Error: " + error.message);
  }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Proxy running on port ${PORT}`));
