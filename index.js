import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// صفحة تجريبية
app.get("/", (req, res) => {
  res.send("✅ Proxy يعمل عبر Render مع SSL مجاني!");
});

// توجيه كل الطلبات نحو موقعك في Awardspace
app.use("/api", async (req, res) => {
  try {
    const targetUrl = "http://gaaaagaaa.onlinewebshop.net" + req.url;
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: { ...req.headers, host: "gaaaagaaa.onlinewebshop.net" },
      body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    });

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).send("❌ Proxy Error: " + error.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Proxy running on port ${PORT}`);
});
