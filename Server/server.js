const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser')
const mongoClient = require('mongodb').MongoClient;
var mongoConnection = undefined;
var url = "mongodb://127.0.0.1:27017"
var fs = require('fs')
app.use(bodyParser.urlencoded({
  extended: true
}));
app.set("view engine","pug");

app.use(bodyParser.json())

//-------------------------------Mongo Calls-------------------------------------
function getUserDataFromDB(data,callback){
  mongoClient.connect(url,(err,db)=>{
    userData = {};
    mongoConnection = db;
    dbConnection = mongoConnection.db("sharedrive");
    dbConnection.collection("users").findOne({"username":data["username"]},(err,result)=>{
      console.log(result);
      userData["username"] = result["username"];
      userData["friends"] = result["friends"];
      dbConnection.collection("files").find({"file_id":{$in:result["files"]}}).toArray((err,result1)=>{
        if (err) throw err;
        console.log(result1);
        userData["files"] = result1;
        callback(err,userData);
        mongoConnection.close();
      });
    });
  });
}

function getFileData(data,callback){
  mongoClient.connect(url,(err,db)=>{
    fileData = {};
    mongoConnection = db;
    console.log(data);
    dbConnection = mongoConnection.db("sharedrive");
    dbConnection.collection("files").findOne({"file_id":parseInt(data["file_id"])},(err,result)=>{
      console.log(result);
      fileData["user"] = result["owner"];
      fileData["filename"] = result["file_name"];
      callback(err,fileData);
      mongoConnection.close();
    });
  });
}

function getUserChats(data,callback){
  mongoClient.connect(url,(err,db)=>{
    chatData = {};
    mongoConnection = db;
    console.log(data);
    dbConnection = mongoConnection.db("sharedrive");
    dbConnection.collection("conversations").findOne({"participants":{$all:[data["user1"],data["user2"]]}},(err,result)=>{
      console.log(result);
      chatData["messages"] = result["messages"];
      callback(err,chatData);
      mongoConnection.close();
    });
  });
}

function insertChat(data,callback){
  mongoClient.connect(url,(err,db)=>{
    chatData = {};
    mongoConnection = db;
    console.log(data);
    dbConnection = mongoConnection.db("sharedrive");
    dbConnection.collection("conversations").findOne({"participants":{$all:[data["user1"],data["user2"]]}},(err,result)=>{
      console.log(result);
      var messageList = result["messages"];
      messageList.push({"timestamp":new Date(),"author":data["user1"],"data":data["message"],"type":"text"});
      dbConnection.collection("conversations").update({"participants":{$all:[data["user1"],data["user2"]]}},{$set:{messages:messageList}},
    (err,result)=>{
      callback(err,result);
      mongoConnection.close();
    });
    });
  });
}


//------------------------------routes-----------------------------------------------
app.get('/',(req,res)=> res.send("Hello World!"));

app.get('/index',(req,res)=>{
  res.sendFile(path.join(__dirname,"../html","home.html"));
});

app.post('/login_submit', (req,res)=>{
  console.log(req.body.username);
  console.log(req.body.password);
  var data={"username":req.body.username,"password":req.body.password};
  getUserDataFromDB(data,(err,result)=>{
    if (err){
      console.log("Error logging in");
      res.send("Error while logging in");
    }
    else{
      res.render('userPage',{title:"Yo",user:result["username"],message:result["username"],files:result["files"],friends:result["friends"]})
    }
  });
});

app.get('/view',(req,res)=>{
  console.log(req.query.file);
  getFileData({"file_id":req.query.file},(err,fileData)=>{
    if (err){
      console.log("Error while fetching the file data");
      res.send("Error while fetching the file data");
    }
    else{
      var filePath = path.join("Data",fileData["user"],fileData["filename"]);
      console.log(filePath);
      fs.readFile(filePath,(err,data)=>{
        if (err){
          console.log("error reading the file");
          res.send("error reading the file");
        }
        else{
          res.sendFile(data);
        }
      });
    }
  });
});

app.get("/chat",(req,res)=>{
  var user1 = req.query.user1;
  var user2 = req.query.user2;
  console.log("user1 = " + user1 +"\n user2 = " +user2);
  getUserChats({"user1":user1,"user2":user2},(err,result)=>{
    console.log(result);
    res.render('chats',{"messages":result["messages"],"user1":user1,"user2":user2});
  });
});

app.post("/chat_send",(req,res)=>{
  var user1 = req.query.user1;
  var user2 = req.query.user2;
  var chatMessage = req.body.chatMessage;
  console.log(user1);
  console.log(user2);
  console.log(chatMessage);
  insertChat({"user1":user1,"user2":user2,"message":chatMessage},(err,result)=>{
    if (err) throw err;
    console.log(result);
    res.redirect("/chat?user1="+user1+"&user2="+user2);
  });
});

app.get('/logout',(req,res)=>{
  console.log("logging out");
  disconnectMongoConnection();
  res.redirect("/index");
})

app.listen(3000,() => console.log("Example app listening on port 3000!"));
