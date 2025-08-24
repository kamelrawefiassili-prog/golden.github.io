const express = require('express');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const compression = require('compression');
const morgan = require('morgan');

// 👇 هذا هو موقعك الأصلي على AwardSpace
const TARGET = process.env.TARGET || 'http://gaaaagaaa.onlinewebshop.net';
const PORT = process.env.PORT || 10000;

const app = express();
app.enable('trust proxy');
app.use(morgan('combined'));
app.use(compression());

const targetUrl = new URL(TARGET);

const proxy = createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  followRedirects: true,
  ws: true,
  xfwd: true,
  selfHandleResponse: true,
  preserveHeaderKeyCase: true,

  onProxyReq: (proxyReq, req, res) => {
    // نجبر الهيدر Host يطابق الأصل
    proxyReq.setHeader('Host', targetUrl.host);
    // نطلب المحتوى بدون ضغط حتى نقدر نعدّله
    if (proxyReq.removeHeader) proxyReq.removeHeader('accept-encoding');
  },

  // تعديل الكوكيز
  cookieDomainRewrite: { "*": "" },
  cookiePathRewrite: { "*": "/" },

  onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
    // تعديل روابط Location
    if (proxyRes.headers['location']) {
      const publicOrigin = `${req.protocol}://${req.get('host')}`;
      proxyRes.headers['location'] = proxyRes.headers['location'].replace(targetUrl.origin, publicOrigin);
    }

    // إضافة upgrade-insecure-requests
    if (!proxyRes.headers['content-security-policy']) {
      res.setHeader('Content-Security-Policy', 'upgrade-insecure-requests');
    }

    const contentType = proxyRes.headers['content-type'] || '';
    if (contentType.includes('text/html')) {
      let body = responseBuffer.toString('utf8');
      const publicOrigin = `${req.protocol}://${req.get('host')}`;

      // استبدال الروابط المطلقة
      body = body.replaceAll(targetUrl.origin, publicOrigin);
      body = body.replaceAll(`href="//${targetUrl.host}`, `href="//${req.get('host')}"`);
      body = body.replaceAll(`src="//${targetUrl.host}`, `src="//${req.get('host')}"`);

      // حماية للروابط http الصريحة
      body = body.replace(/(href|src)=["']http:\/\/gaaaagaaa\.onlinewebshop\.net/gi, `$1="${publicOrigin}`);

      // تعديل canonical/og:url
      body = body.replace(/(rel=["']canonical["'][^>]*href=["'])https?:\/\/[^"']+(["'])/gi, `$1${publicOrigin}$2`);

      return body;
    }
    return responseBuffer;
  }),
});

app.use('/', proxy);

app.listen(PORT, () => {
  console.log(`HTTPS proxy running on :${PORT} → ${TARGET}`);
});
