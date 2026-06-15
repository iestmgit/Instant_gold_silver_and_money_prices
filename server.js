const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));

function cleanNumber(value) {
  if (!value) return null;

  const cleaned = value
    .toString()
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

async function fetchTGJU() {
  const url = "https://www.tgju.org/";

  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8"
    },
    timeout: 15000
  });

  const $ = cheerio.load(response.data);

  const result = {
    gold: [],
    coin: [],
    currency: [],
    updatedAt: new Date().toISOString()
  };

  /*
    نکته:
    ساختار HTML سایت TGJU ممکنه تغییر کنه.
    این parser عمومی تلاش می‌کنه از جدول‌ها داده استخراج کنه.
  */

  $("tr").each((index, el) => {
    const cells = [];

    $(el)
      .find("td, th")
      .each((i, cell) => {
        const text = $(cell).text().replace(/\s+/g, " ").trim();
        if (text) cells.push(text);
      });

    if (cells.length < 2) return;

    const title = cells[0];
    const priceText = cells[1];
    const price = cleanNumber(priceText);

    if (!title || !price) return;

    const item = {
      name: title,
      price,
      rawPrice: priceText,
      change: cells[2] || "-",
      min: cells[3] || "-",
      max: cells[4] || "-",
      time: cells[cells.length - 1] || "-"
    };

    const normalizedTitle = title.replace(/\s+/g, "");

    if (
      normalizedTitle.includes("طلا") ||
      normalizedTitle.includes("انس") ||
      normalizedTitle.includes("مثقال") ||
      normalizedTitle.includes("آبشده") ||
      normalizedTitle.includes("نقره")
    ) {
      result.gold.push(item);
    } else if (
      normalizedTitle.includes("سکه") ||
      normalizedTitle.includes("نیم") ||
      normalizedTitle.includes("ربع")
    ) {
      result.coin.push(item);
    } else if (
      normalizedTitle.includes("دلار") ||
      normalizedTitle.includes("یورو") ||
      normalizedTitle.includes("درهم") ||
      normalizedTitle.includes("پوند") ||
      normalizedTitle.includes("لیر")
    ) {
      result.currency.push(item);
    }
  });

  return result;
}

app.get("/api/prices", async (req, res) => {
  try {
    const data = await fetchTGJU();

    res.json({
      success: true,
      source: "tgju.org",
      data
    });
  } catch (error) {
    console.error("TGJU fetch error:", error.message);

    res.status(500).json({
      success: false,
      message: "خطا در دریافت اطلاعات از TGJU",
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});
