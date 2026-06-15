const express = require("express")
const axios = require("axios")
const cheerio = require("cheerio")
const path = require("path")

const app = express()
const PORT = 3000

app.use(express.static(path.join(__dirname, "public")))

function cleanNumber(str) {
  return Number(str.replace(/,/g, "").replace(/[^\d.]/g, ""))
}

async function fetchTGJU() {

  const { data } = await axios.get("https://www.tgju.org/", {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  })

  const $ = cheerio.load(data)

  const result = {
    gold: [],
    coin: [],
    currency: []
  }

  $("tr").each((i, el) => {

    const cells = []

    $(el).find("td").each((j, td) => {
      cells.push($(td).text().trim())
    })

    if (cells.length < 2) return

    const name = cells[0]
    const price = cleanNumber(cells[1])

    if (!price) return

    const item = {
      name,
      price,
      change: cells[2] || "-",
      min: cells[3] || "-",
      max: cells[4] || "-",
      time: cells[5] || "-"
    }

    if (name.includes("طلا") || name.includes("نقره") || name.includes("مثقال"))
      result.gold.push(item)

    else if (name.includes("سکه") || name.includes("ربع") || name.includes("نیم"))
      result.coin.push(item)

    else if (name.includes("دلار") || name.includes("یورو") || name.includes("درهم"))
      result.currency.push(item)

  })

  return result
}

app.get("/api/prices", async (req, res) => {

  try {

    const data = await fetchTGJU()

    res.json({
      success: true,
      data
    })

  } catch (err) {

    res.status(500).json({
      success: false,
      error: err.message
    })

  }

})

app.listen(PORT, () => {
  console.log("server running http://localhost:3000")
})
