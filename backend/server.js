const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const Joi = require("joi");

const app = express();
app.use(cors());
app.use(express.json());

// Deserveste imaginile static
app.use("/images", express.static(path.join(__dirname, "images")));

const JSON_SERVER_URL = "http://localhost:3000/quotes";

//verificam daca id-ul din PUT și DELETE este un numar valid
const validateId = (req, res, next) => {
  if (isNaN(req.params.id)) {
    return res.status(400).json({ error: "Invalid ID-ul format" });
  }
  next();
};

//Schema Joi pentru validarea citatelor
const quoteSchema = Joi.object({
  author: Joi.string().min(2).required(),
  quote: Joi.string().min(5).required(),
});

//Extragem citatele
{
  app.get("/api/quotes", async (req, res) => {
    try {
      const response = await fetch(JSON_SERVER_URL);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Eroare la preluarea citatelor:", error);
      res.status(500).json({ message: "Error fetching quotes" });
    }
  });
}

//Adauga un citat nou
app.post("/api/quotes", async (req, res) => {
  const { error } = quoteSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  try {
    const response = await fetch(JSON_SERVER_URL);
    const quotes = await response.json();
    //generam un ID numeric (urmatorul numar disponibil)
    const newId =
      quotes.length > 0 ? Math.max(...quotes.map((q) => Number(q.id))) + 1 : 1;

    const newQuote = { id: newId.toString(), ...req.body }; // convertim ID-ul in sir pentru a se potrivi cu formatul db.josn
    //trimitem la json-server
    const postResponse = await fetch(JSON_SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newQuote),
    });
    const data = await postResponse.json();
    res.status(postResponse.status).json(data);
  } catch (error) {
    console.error("Eroare la adaugarea citatului:", error);
    res.status(500).json({ message: "Error adding quote" });
  }
});

//actualizeaza un citat existent
app.put("/api/quotes/:id", validateId, async (req, res) => {
  const { error } = quoteSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  try {
    const quoteId = req.params.id;

    // contruiti obiectul actualizat, asigurandu-va ca include ID-ul este prima cheie
    const updatedQuote = { id: quoteId, ...req.body };

    const response = await fetch(`${JSON_SERVER_URL}/${quoteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedQuote),
    });
    const data = await response.json();

    //creati un nou obiect cu ID-ul ca prima cheie
    const reorderedData = {
      id: data.id,
      author: data.author,
      quote: data.quote,
    };
    res.status(response.status).json(reorderedData);
  } catch (error) {
    console.error("Eroare la actualizarea citatului:", error);
    res.status(500).json({ message: "Error updating quote" });
  }
});

// Stergem un citat
app.delete("/api/quotes/:id", validateId, async (req, res) => {
  try {
    const quoteId = req.params.id;
    const response = await fetch(`${JSON_SERVER_URL}/${quoteId}`);
    //verificam daca exista citatul
    if (!response.ok) {
      return res.status(404).json({ message: "Quote not found" });
    }
    await fetch(`${JSON_SERVER_URL}/${quoteId}`, {
      method: "DELETE",
    });
    res.status(200).json({ message: "Quote deleted" });
  } catch (error) {
    next(error);
  }
});

const PORT = process.env.port || 5000;
app.listen(PORT, () =>{
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Serving static images from: ${path.join(__dirname, "images")}`)
})