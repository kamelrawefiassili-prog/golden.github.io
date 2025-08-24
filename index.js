const express = require('express');
const fetch = require('node-fetch');
const app = express();

// لمعالجة cookies وجلسات PHP
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/', async (req, res) => {
  try {
    const targetUrl = 'http://gaaaagaaa.onlinewebshop.net' + req.url;
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
        'Cookie': req.headers.cookie || '',
        'User-Agent': req.headers['user-agent']
      },
      body: req.method === 'POST' ? JSON.stringify(req.body) : null
    });

    // نسخ cookies من الاستجابة إلى المستخدم
    const cookies = response.headers.raw()['set-cookie'];
    if (cookies) {
      cookies.forEach(cookie => {
        res.setHeader('Set-Cookie', cookie);
      });
    }

    const data = await response.text();
    res.send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).send('خطأ في الخادم');
  }
});

app.listen(3000, () => console.log('🚀 PHP Proxy running...'));
