const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser')
const mongoClient = require('mongodb').MongoClient;
const sha1File = require('sha1-file');
var mongoConnection = undefined;
var url = "mongodb://127.0.0.1:27017"
const fs = require('fs-extra')
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

function checkUser(data,callback){
  mongoClient.connect(url,(err,db)=>{
    mongoConnection = db;
    dbConnection = mongoConnection.db("sharedrive");
    dbConnection.collection("users").findOne({"username":data["username"],"password":data["password"]},(err,result)=>{
      callback(err,result);
      mongoConnection.close();
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

function getContacts(data,callback){
  console.log(data);
  mongoClient.connect(url,(err,db)=>{
    mongoConnection = db;
    dbConnection = mongoConnection.db("sharedrive");
    dbConnection.collection("users").find().toArray((err,result)=>{
      console.log(result);
      var contactList = [];
      result.forEach((valueDict)=>{
        if (valueDict["username"]!==data["username"]){
          contactList.push(valueDict["username"]);
        }
      });
      callback(err,contactList);
      mongoConnection.close();
    });
  });
}

function addUserToDB(data,callback){
  mongoClient.connect(url,(err,db)=>{
    mongoConnection = db;
    console.log(data);
    dbConnection = mongoConnection.db("sharedrive");
    dbConnection.collection("users").insertOne({"username":data["username"],"password":data["password"],"friends":[],"files":[],
                                                "conversations":[]},(err,result)=>{
      console.log(result);
      callback(err,result);
      mongoConnection.close();
    });
  });
}
function addFileToUser(data,callback){
  console.log(data);
  mongoClient.connect(url,(err,db)=>{
    mongoConnection = db;
    dbConnection = mongoConnection.db("sharedrive");
    dbConnection.collection("users").findOne({"username":data["user"]},(err,result)=>{
    console.log(result);
    var fileList = result["files"];
    fileList.push(parseInt(data["file"]));
    dbConnection.collection("users").update({"username":data["user"]},{$set:{files:fileList}},(err,result)=>{
      console.log(result);
      callback(err,result);
      mongoConnection.close();
    });
    });
  });
}

function renameFile(data,callback){
  console.log(data);
  mongoClient.connect(url,(err,db)=>{
    mongoConnection = db;
    dbConnection.collection("files").update({"file_id":data["file_id"]},{$set:{file_name:data["fileName"]}}(err,result)=>{
      callback(err,result);
      mongoConnection.close();
    });
  });
}

function addFriendToUser(data,callback){
  mongoClient.connect(url,(err,db)=>{
    mongoConnection = db;
    console.log(data);
    dbConnection = mongoConnection.db("sharedrive");
    dbConnection.collection("users").findOne({"username":data["user1"]},(err,result)=>{
      var friendList = result["friends"];
      friendList.push(data["user2"]);
      dbConnection.collection("users").update({"username":data["user1"]},{$set:{friends:friendList}},(err,result)=>{
        console.log(result);
        callback(err,result);
        mongoConnection.close();
      });
    });
  });
}

function insertFileToUser(data,callback){
  mongoClient.connect(url,(err,db)=>{
    mongoConnection = db;
    console.log(data);
    dbConnection = mongoConnection.db("sharedrive");
    var fileSha = sha1File(data["filePath"]);
    dbConnection.collection("files").find().toArray((err,result)=>{
      console.log(result);
      var file_id = -1;
      var flag = 0;
      var userList = null;
      result.forEach((valueDict)=>{
        if (valueDict["hash_value"]===fileSha){
          file_id = valueDict["file_id"];
          userList = valueDict["users"];
          userList.push(data["user"])
          flag = 1;
        }
        else{
          if (valueDict["file_id"]>file_id && flag === 0){
            file_id = valueDict["file_id"];
          }
        }
      });
      if(flag==0){
        file_id = file_id+1;
        dbConnection.collection("files").insertOne({"owner":data["user"],"file_id":file_id,"file_name":data["fileName"],
                                                  "hash_value":fileSha,"users":[data["user"]]}, (err,result)=>{
                if(err) throw err;
                console.log(result);
      });
    }
    else {
      dbConnection.collection("files").update({"file_id":file_id},{$set:{users:userList}},(err,result)=>{
        if (err) throw err;
        console.log(result);
      });
    }
    dbConnection.collection("users").findOne({"username":data["user"]},(err,result)=>{
      if(err) throw err;
      var fileList = result["files"];
      fileList.push(file_id);
      dbConnection.collection("users").update({"username":data["user"]},{$set:{files:fileList}},(err,result)=>{
        console.log(result);
        callback(err,result);
        mongoConnection.close();
      })
    });
    });
  });
}

//------------------------------routes-----------------------------------------------
app.get('/',(req,res)=> res.send("Hello World!"));

app.get('/index',(req,res)=>{
  res.sendFile(path.join(__dirname,"../html","home.html"));
});



app.get('/home',(req,res)=>{
  var user = req.query.user;
  getUserDataFromDB({"username":user},(err,result)=>{
    if (err){
      console.log("Error logging in");
      res.send("Error while logging in");
    }
    else{
      res.render('userPage',{title:"Yo",user:result["username"],message:result["username"],files:result["files"],friends:result["friends"]})
    }
  });
});

app.post('/login_submit', (req,res)=>{
  var username = req.body.username;
  var password = req.body.password;
  checkUser({"username":username,"password":password},(err,result)=>{
    if (err){
      res.end("Invalid Username/password");
    }
    else{
      if (result == null){
        console.log("result is null");
        res.render("signup",{"username":username});
      }
      else{
        res.redirect("/home?user="+username);
      }
    }
  });
});


app.post('/signUp',(req,res)=>{
  var username = req.body.username;
  var password = req.body.password;
  var confirmPassword = req.body.confirm_password;
  if (password === confirmPassword){
    console.log("same password");
    addUserToDB({"username":username,"password":password},(err,result)=>{
      res.redirect("/home?user="+username);
    });
  }
  else{
    console.log("not same password");
    res.render("signup",{"username":username,"invalid":true});
  }
});


app.get('/view',(req,res)=>{
  console.log(req.query.file);
  getFileData({"file_id":req.query.file},(err,fileData)=>{
    if (err){
      console.log("Error while fetching the file data");
      res.send("Error while fetching the file data");
    }
    else{
      var filePath = path.join(__dirname,"Data",fileData["user"],fileData["filename"]);
      console.log(filePath);
      fs.readFile(filePath,'utf8',(err,data)=>{
        if (err){
          console.log("error reading the file");
          res.send("error reading the file");
        }
        else{
          console.log(data);
          res.send(data);
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

app.post("/upload",(req,res)=>{
  var user = req.query.user;
  var filePath = req.body.fileName;
  console.log(user+" "+filePath);
  var temp = filePath.split('/')
  var fileName = temp[temp.length-1];
  var destDir = path.join("Data",user);
  fs.ensureDir(destDir,err =>{
    if (err){
    console.log("Directory "+destDir+" created.");
  }
  var userFilePath = path.join(destDir,fileName);
  fs.copy(filePath,userFilePath,err=>{
    if (err) throw err;
    console.log("success");
    insertFileToUser({"user":user,"fileName":fileName,"filePath":userFilePath},(err,result)=>{
      if(err){
        res.send("Error uploading file");
      }
      else {
        res.redirect("/home?user="+user);
      }
    });
  });
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
});

app.post("/addFriends",(req,res)=>{
  console.log("Add friends");
  var user = req.query.user;
  getContacts({"username":user},(err,result)=>{
    res.render("contact",{"user":user,"contacts":result});
  });
});

app.get("/addFriendToUser",(req,res)=>{
  console.log("adding");
  var user1 = req.query.user1;
  var user2 = req.query.user2;
  addFriendToUser({"user1":user1,"user2":user2},(err,result)=>{
    if (err) throw err;
    res.redirect("/home?user="+user1);
  });
});

app.post("/sendFile",(req,res)=>{
  var user = req.query.user;
  var fileID = req.query.file;
  console.log(user+" "+fileID);
  getContacts({"username":user},(err,result)=>{
    res.render("shareTo",{"user":user,"contacts":result,"file":fileID});
  });
});
app.get("/addFileToUser",(req,res)=>{
  var user1 = req.query.user1;
  var user2 = req.query.user2;
  var file = req.query.file;
  console.log(user1+" "+file);
  addFileToUser({"user":user2,"file":file},(err,result)=>{
    if(err) throw err;
    res.redirect('/home?user='+user1);
  });
});

app.get("/download",(req,res)=>{
  var file = req.query.file;
  var user = req.query.user;
  downloadFile({"file_id":file},(err,result)=>{
    if(err) throw err;
    res.redirect("/home?user="+user);
  });
});

app.get("/removeFiles",(req,res)=>{
  var file = req.query.file;
  var user = req.query.user;
  removeFile({"file_id":file},(err,result)=>{
    if(err) throw err;
    res.redirect("/home?user="+user);
  });
});

app.get("/renameFile",(req,res)=>{
  var user = req.query.user;
  var file_id = req.query.file;
  var fileName = req.query.fileName;
  renameFile({"file_id":file_id,"fileName":fileName},(err,result)=>{
    res.redirect("/home?user="+user);
  });
});

app.get("/signOut",(req,res)=>{
  res.redirect("/index");
});



app.listen(3000,() => console.log("Example app listening on port 3000!"));
