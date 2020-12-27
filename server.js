//HTML 
const html = require('html');
const url = require('url');
const assert = require('assert');
//File
const fs = require('fs'); 
const formidable = require('express-formidable');
//MongoDB
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

const mongourl = 'mongodb+srv://';
const dbName = 'project';
//Express.js
const express = require('express');
const app = express();
const session = require('cookie-session');

const bodyParser = require('body-parser');

const { Buffer } = require('safe-buffer');

var users = new Array(
	{name: "natasha", password: "itsNat"},
    {name: "demo", password: ""},
    {name: "student", password: ""}
);
var DOC = {};
//Main Body
app.set('view engine', 'ejs');
app.use(formidable());

//Middleware
app.use(bodyParser.json());
//Cookie
app.use(session({
    userid: "session",  
    keys: ['th1s!sA5ecretK3y'],
    //maxAge: 90 * 24 * 60 * 60 * 1000
}));

//functions
    //create new restautant docs
const createDocument = (db, createDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) =>{
        assert.equal(null, err);
        console.log("Connected successfully to the DB server.");
        const db = client.db(dbName);

        db.collection('restaurant').insertOne(createDoc, (error, results)=>{
            if(error) throw error;
            console.log(results);
            callback();
        });
    });
}
    //find doc with criteria
const findDocument = (db, criteria, callback) => {
    let cursor = db.collection('restaurant').find(criteria);
    console.log(`findDocument: ${JSON.stringify(criteria)}`);
    cursor.toArray((err, docs)=>{
        assert.equal(err, null);
        console.log(`findDocument: ${docs.length}`);
        callback(docs);
    });
}
const deleteDocument = (db, criteria, callback) => {
    db.collection('restaurant').deleteOne(
       criteria, 
       (err, results) => {
          assert.equal(err, null);
          console.log(results);
          callback();
       }
    );
};
const updateDocument = (criteria, updateDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        db.collection('restaurant').updateOne(criteria,
            {
                $set : updateDoc
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
}

const handle_Find = (req, res, criteria) =>{
    const client = new MongoClient(mongourl);
    client.connect((err)=>{
        assert.equal(null, err);
        console.log("Connected successfully to the DB server.");
        const db = client.db(dbName);
        //callback()
        findDocument(db, {}, (docs)=>{
            client.close();
            console.log("Closed DB connection.");
            res.status(200).render('home', {name: `${req.session.userid}`, nRestaurant: docs.length, restaurant: docs});
        });
    });
}

const handle_Details = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to DB server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id);
        findDocument(db, DOCID, (docs) => {  
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('details', {restaurant: docs[0]});
        });
    });
}

const handle_Delete = (res, criteria) =>{
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id);
        DOCID['owner'] = criteria.owner;
        deleteDocument(db, DOCID, (results)=>{
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('info', {message: "Document successfully deleted."});
        })     
    });
    client.close();
    res.status(200).render('info', {message: "Document successfully deleted."});
}
//handling requests
app.get('/', (req, res)=>{
    if(!req.session.authenticated){
        console.log("...Not authenticated; directing to login");
        res.redirect("/login");
    }
    console.log("...Hello, welcome back");
    handle_Find(req, res, {});
});
//login
app.get('/login', (req, res)=>{
    console.log("...Welcome to login page");
    res.sendFile(__dirname + '/public/login.html');
    res.status(200).render("login");
});

app.post('/login', (req, res)=>{
    console.log("...Handling your login request");
    users.forEach((user) => {
		if (user.name == req.fields.username && user.password == req.fields.password) {
        req.session.authenticated = true;
        req.session.userid = req.fields.username;
        console.log(req.session.userid);
        res.status(200).redirect("/home");
        }
    });
    res.redirect("/");
});
app.use((req, res, next) => {
    console.log("...Checking login status");
    if (req.session.authenticated){
      next();
    } else {
      res.redirect("/login");
    }
});

app.get('/logout', (req, res)=>{
    req.session = null;
    req.authenticated = false;
    res.redirect('/');
});
//Home page
app.get('/home', (req, res)=>{
    console.log("...Welcome to the home page!")
    const client = new MongoClient(mongourl);
    client.connect((err)=>{
        assert.equal(null, err);
        console.log("Connected successfully to the DB server.");
        const db = client.db(dbName);
        //callback()
        findDocument(db, {}, (docs)=>{
            client.close();
            console.log("Closed DB connection.");
            res.status(200).render('home', {name: `${req.session.userid}`, nRestaurant: docs.length, restaurant: docs});
        });
    });
    //res.status(200).render('home', {name: `${req.session.userid}`});
});
//details
app.get('/details', (req,res) => {
    handle_Details(res, req.query);
});

app.get("/map", (req, res) => {
    console.log("...returning the map leaflet.");
	res.status(200).render("map", {
		lat:`${req.query.lat}`,
		lon:`${req.query.lon}`,
		zoom:`${req.query.zoom ? req.query.zoom : 15}`
	});
});

app.get('/create', (req, res)=>{
    res.status(200).render("create");
});
app.post('/create', (req, res)=>{
    console.log("...create a new document!");
    const client = new MongoClient(mongourl);
    client.connect((err)=>{
        assert.equal(null, err);
        console.log("Connected successfully to the DB server.");
        const db = client.db(dbName);
        
        DOC['restaurant_id']= "";
        DOC['name']= req.fields.name;
        DOC['borough']= req.fields.borough;
        DOC['cuisine']= req.fields.cuisine;
        DOC['grades']= [];
        DOC['owner']= `${req.session.userid}`;
        console.log("...putting data into DOC");
        var adoc ={};
        adoc['building'] = req.fields.building;
        if(req.fields.latitude && req.fields.longitude){
            adoc['coord'] = [req.fields.latitude, req.fields.longitude];
        }
        adoc['street'] = req.fields.street;
        adoc['zipcode'] = req.fields.zipcode;
        DOC['address'] = adoc;

        var pdoc = {};
        if (req.files.photo && req.files.photo.size > 0 && (pdoc['mimetype'] == 'image/jpeg' || pdoc['mimetype'] == 'image/png')) {
            fs.readFile(req.files.photo.path, (err, data) => {
                assert.equal(err,null);
                pdoc['title'] = req.fields.title;
                pdoc['data'] = new Buffer.from(data).toString('base64');
                pdoc['mimetype'] = req.files.photo.type;
                    
            });
        } 
        DOC['photo'] = pdoc;
        
        if(DOC.name &&  DOC.owner){
            console.log("...Creating the document");
            createDocument(db, DOC, (docs)=>{
                client.close();
                console.log("Closed DB connection");
                res.status(200).render('info', {message: "Document created successfully!"});
            });
        } else{
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('info', {message: "Invalid entry - Name & Owner is compulsory!"});
        }
    });
    client.close();
    console.log("Closed DB connection");
    res.status(200).render('info', {message: "Document created"}); 
});

app.get('/edit', (req, res)=>{
    console.log("...Enter update page");
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(req.query._id);
        findDocument(db, DOCID, (docs) => {  
            client.close();
            console.log("Closed DB connection");
            console.log(docs[0]);
            res.status(200).render('edit', {restaurant: docs[0]});
        });
    });

}); 
app.post('/update', (req, res)=>{
    var updateDOC={};
    console.log("...handle Update");
    const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            console.log("...checking owner");
            
            if(req.fields.owner == req.session.userid){
                if(req.fields.name){
                updateDOC['name']= req.fields.name;
                updateDOC['borough']= req.fields.borough;
                updateDOC['cuisine']= req.fields.cuisine;
                updateDOC['grades']= [];
                updateDOC['owner']= `${req.session.userid}`;
                var adoc ={};
                adoc['building'] = req.fields.building;
                adoc['street'] = req.fields.street;
                adoc['zipcode'] = req.fields.zipcode;
                adoc['coord'] = [req.fields.latitude, req.fields.longitude];
                updateDOC['address'] = adoc;
                var DOCID = {};
                DOCID['_id'] = ObjectID(req.fields._id);
                if (req.files.photo.size > 0) {
                    var pdoc = {};
                    fs.readFile(req.files.photo.path, (err, data) => {
                        assert.equal(err,null);
                        pdoc['title'] = req.fields.title;
                        pdoc['data'] = new Buffer.from(data).toString('base64');
                        pdoc['mimetype'] = req.files.photo.type;
                            
                    });
                    updateDOC['photo'] = pdoc;
                    updateDocument(DOCID, updateDOC, (docs) => {
                        client.close();
                        console.log("Closed DB connection");
                        res.status(200).render('info', {message: "Document updated successfully!."});
                    });
                }else{
                    updateDocument(DOCID, updateDOC, (docs) => {
                        client.close();
                        console.log("Closed DB connection");
                        res.status(200).render('info', {message: "Document updated successfully!."});
                    });
                }
            }else{
                res.status(200).render('info', {message: "Invalid entry - Name is compulsory!"});}
              
    }else{
                res.status(200).render('info', {message: "Invalid owner - Only the owner can update the page!"});
            }
    });
    
});

app.get('/delete', (req, res)=>{
    if(req.session.userid == req.query.owner){
        console.log("...hello owner of the document");
        handle_Delete(res, req.query);
    }else{
        res.status(200).render('info', {message: "Access denied - You don't have the access right!"}); 
    }
});

app.get('/rate', (req, res)=>{
    console.log("...Enter rating page");
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(req.query._id)
        findDocument(db, DOCID, (docs) => {  
            client.close();
            console.log("Closed DB connection");
            if (docs[0].grades != null) {
                console.log(docs[0]);
                if(docs[0].grades.filter(doc =>{return doc.user==req.session.userid}).length==0){
                    res.render("rate", {username: `${req.session.userid}`, name: docs[0].name, _id: DOCID});
                    
                }else{
                    res.status(200).render('info', {message: "Invalid action - you cannot rate again !"});
                }
                console.log(docs[0]);
            }else{
                res.render("rate", {username: `${req.session.userid}`, name: docs[0].name, _id: DOCID});
            }
            });
    });

}); 

app.post('/rate', (req, res)=>{
    console.log("...Handle rating");
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(req.query._id);
        if(req.fields.rate>0 && req.fields.rate<=10){
            console.log("req.fields.rate: " + req.fields.rate);
            updateDocument(DOCID, { "grades.$": {
                "user": req.session.userid,
                "score": req.fields.rate
            }}, ()=> {
                client.close();
                console.log("Closed DB connection");
                res.status(200).render('info', {message: "Restaurant successfully rated!"});
            });
        }else{
            client.close();
            console.log("Closed Db connection");
            res.status(200).render('info', {message: "Invalid action - please rate between 1 - 10 !"});
        }
        });
});

//Rest API
//name
app.get('/api/restaurant/name/:name', function(req,res)  {
    console.log("...Rest Api");
	console.log("name: " + req.params.name);
    if (req.params.name) {
        let criteria = {};
        criteria['name'] = req.params.name;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing name"});
    }
});
///borough
app.get('/api/restaurant/borough/:borough', (req,res) => {
    console.log("...Rest Api");
	console.log("borough: " + req.params.borough);
    if (req.params.borough) {
        let criteria = {};
        criteria['borough'] = req.params.borough;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing borough"});
    }
});
//cuisine
app.get('/api/restaurant/cuisine/:cuisine', (req,res) => {
    console.log("...Rest Api");
	console.log("cuisine: " + req.params.cuisine);
    if (req.params.cuisine) {
        let criteria = {};
        criteria['cuisine'] = req.params.cuisine;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing cuisine"});
    }
});

app.get('/*', (req, res)=>{
    res.status(404).render("info", {message: `${req.path} - Unknown request!`})
});

app.listen(process.env.PORT || 8099);
