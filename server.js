require('dotenv').config();


const express = require('express');
const mongoose = require('mongoose');
const { json, urlencoded } = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();

app.use(json());
app.use(urlencoded({ extended: false }));

app.use(cors());

const port = process.env.PORT || 3000;


// Db connection
// mongoose.connect('mongodb://localhost:27017/beveragedb');
// mongoose.connect('mongodb+srv://venlomj:Prijor1724@mjcluster.8rhdofc.mongodb.net/beveragedb?retryWrites=true&w=majority');

const uri = process.env.MONGO_URI
console.log("Mongo URI:", uri); // Log the URI

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true, writeConcern: { w: "majority" }, useFindAndModify: false })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Create schema
const beverageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter a beverage name"]
    },
    sugar: {
        type: Number,
        required: true,
        default: 0
    },
    rating: {
        type: Number,
        required: true,
        default: 0
    },
    scanned: {
        type: Boolean,
        default: false,
    },
    beverage_image: {
        type: String,
        required: false,
    }
});

// Create model for beverages
const Beverage = mongoose.model('Beverage', beverageSchema);

app.get('/', (req, res) => {
    res.send('Hello Beverage API')
})

// Retrieve beverages with images
app.get('/api/beverages', async (req, res) => {
    try {
        const beverages = await Beverage.find({});
        const beveragesWithImages = beverages.map(beverage => {
            return {
                _id: beverage._id,
                name: beverage.name,
                sugar: beverage.sugar,
                rating: beverage.rating,
                scanned: beverage.scanned,
                beverage_image: beverage.beverage_image ? `${req.protocol}://${req.get('host')}/assets/${beverage.beverage_image}` : null
            };
        });
        res.status(200).json(beveragesWithImages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// // Retrieve beverages
// app.get('/api/beverages', async (req, res) => {
//     try {
//         const beverages = await Beverage.find({});
//         res.status(200).json(beverages);
//     } catch (error) {
//         res.status(500).json({message: error.message})
//     }
// });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'assets')); // I will store the images in the assets folder of the frontend
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname;
        cb(null, fileName);
    }
});

const upload = multer({ storage: storage });

// Add a beverage
app.post('/api/beverages/add', upload.single('beverage_image'), async (req, res) => {
    try {
        console.log(req.body); // Log the request body to the console
        const { name, sugar, rating, scanned } = req.body;

        // Get the filename of the uploaded image
        const beverage_image = req.file.filename;

        const newBeverage = new Beverage({
            name,
            sugar,
            rating,
            scanned,
            beverage_image,
        });
        
        const savedBeverage = await newBeverage.save();
        res.status(200).json(savedBeverage);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
});

// Serve images from the 'assets' directory
app.use('/assets', express.static(path.join(__dirname, 'assets')));

//get by id
app.get('/api/beverages/get/:id', async (req, res) => {
    try {
        const {id} = req.params;
        const beverage = await Beverage.findById(id);
        res.status(200).json(beverage);
    } catch (error) {
        res.status(500).json({message: error.message})
    }
});

// Get beverage by name
app.get('/api/beverages/name/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const beverage = await Beverage.findOne({ name: name });
        if (!beverage) {
            return res.status(404).json({ message: `Beverage with name ${name} not found` });
        }
        res.status(200).json(beverage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a beverage
app.put('/api/beverages/update/:id', upload.single('beverage_image'), async (req, res) => {
    try {
        const { id } = req.params;
        let updateBeverage = req.body;

        if(req.file) {
            updateBeverage = {
                ...updateBeverage,
                beverage_image: req.file.filename,
            };
        }
        const beverage = await Beverage.findByIdAndUpdate(id, updateBeverage, { new: true });

        if(!beverage) {
            return res.status(404).json({message: `cannot find any beverage witg the id, ${id}`})
        }
        const updatedBeverage = await Beverage.findById(id);
        res.status(200).json(updatedBeverage);

    } catch (error) {
        res.status(500).json({message: error.message})
    }
});

// Delete a beverage
app.delete('/api/beverages/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const beverage = await Beverage.findByIdAndDelete(id, req.body);

        if(!beverage) {
            return res.status(404).json({message: `cannot find any beverage witg the id, ${id}`})
        }
        res.status(200).json(beverage);
        
    } catch (error) {
        res.status(500).json({message: error.message})
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;


