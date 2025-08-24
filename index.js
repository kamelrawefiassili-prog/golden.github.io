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

// مساعدة لتعديل الروابط والفورمات في HTML
async function rewriteHTML(body) {
  const dom = new JSDOM(body);
  const document = dom.window.document;

  // تعديل كل الفورمات
  document.querySelectorAll("form").forEach(form => {
    let action = form.getAttribute("action");
    if (action && !action.startsWith("http")) {
      form.setAttribute("action", "/api/" + action);
    }
  });

  // تعديل كل الروابط الداخلية
  document.querySelectorAll("a").forEach(a => {
    let href = a.getAttribute("href");
    if (href && !href.startsWith("http") && !href.startsWith("#")) {
      a.setAttribute("href", "/api/" + href);
    }
  });

  return dom.serialize();
}

// صفحة افتراضية
app.get("/", (req, res) => {
  res.send("✅ GoldenStore Proxy running with SSL on Render!");
});

// كل طلبات /api/*
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
      fetchOptions.body = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : undefined;
    }

    // جلب البيانات من الموقع الأصلي
    const response = await fetch(targetUrl, fetchOptions);

    // محتوى HTML → نعدل الروابط والفورمات
    const contentType = response.headers.get("content-type") || "";
    let data;
    if (contentType.includes("text/html")) {
      const text = await response.text();
      data = await rewriteHTML(text);
      res.set("Content-Type", "text/html");
      res.send(data);
    } else {
      // أي محتوى آخر (JSON، صور، JS...) نرسله مباشرة
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
