const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const corsOption = {
    origin: ['http://localhost:5173'],
    credentials: true,
    optionSuccessStatus: 200,
};

const app = express();
app.use(cors(corsOption));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.zuwbcyf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



async function run() {
  try {
    const database = client.db("PaymentDb");
    const productsCollection = database.collection('products');  // Reference the collection
    
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    
    app.get('/', (req, res) => {
      res.send("Vaaiya tomar server medicine kiner jonno ready");
    });

    app.get('/api/products', async (req, res) => {
      console.log(req.query);
      const { page = 1, limit = 10, brandName, category, minPrice, maxPrice, search, sortBy, sortOrder = 'asc', dateSort } = req.query;
      const filter = {};
   
      if (brandName) filter.brandName = { $regex: brandName, $options: 'i' };
      if (category) filter.category = category;
      if (minPrice || maxPrice) filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      if (search) filter.productName = { $regex: search, $options: 'i' };
   
      const sort = {};
      if (sortBy === 'date') {
          sort.productCreationDateTime = dateSort === 'desc' ? -1 : 1;
      } else if (sortBy) {
          sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      }
   
      const products = await productsCollection
          .find(filter)
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(parseInt(limit))
          .toArray();
   
      const totalProducts = await productsCollection.countDocuments(filter);
      const totalPages = Math.ceil(totalProducts / limit);
   
      res.json({
          products,
          totalPages,
          currentPage: parseInt(page),
          totalProducts
      });
  });
    app.get('/api/brands', async (req, res) => {
      try {
          const brands = await productsCollection.aggregate([
              { $group: { _id: "$brandName" } },
              { $project: { _id: 0, brand: "$_id" } }
          ]).toArray();
          res.json({ brands: brands.map(brand => brand.brand) });
      } catch (error) {
          console.error("Error fetching brands", error);
          res.status(500).json({ error: "Internal Server Error" });
      }
  });
  app.get('/api/categories', async (req, res) => {
    try {
        const categories = await productsCollection.aggregate([
            { $group: { _id: "$category" } },
            { $project: { _id: 0, category: "$_id" } }
        ]).toArray();
        res.json({ categories: categories.map(category => category.category) });
    } catch (error) {
        console.error("Error fetching categories", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
  

  } catch (error) {
    console.error("Error connecting to MongoDB", error);
  } finally {
    // Make sure to close the client connection when the app is stopped or when the task is complete.
    // client.close(); // Uncomment this if you want to close the connection after use
  }
}

run().catch(console.dir);




app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});