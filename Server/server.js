const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser')
const mongoClient = require('mongodb').MongoClient;
var url = "mongodb://127.0.0.1:27017"
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(bodyParser.json())

mongoClient.connect(url,(err,db) =>{
if (err) throw err;
console.log("DB found");
db.close();
})

app.get('/',(req,res)=> res.send("Hello World!"));

app.get('/index.html',(req,res)=>{
  res.sendFile(path.join(__dirname,"../html","home.html"));
});

app.post('/login_submit', (req,res)=>{
  console.log(req.body.username);
  console.log(req.body.password);
  res.send("login done");
});

app.listen(3000,() => console.log("Example app listening on port 3000!"));
