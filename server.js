//require the config file
var config = require('./config.json');

//let's get the database schema
var schema = require(config.database.schemaLocation);

//Creates the server 
var express = require('express');
var app = express();

//Mysql dependencie
var mysql = require('mysql');

//Other dependencies
var squel = require('squel');
var _ = require('underscore');
var bodyParser = require('body-parser');
var cors = require('cors');
var hat = require('hat');


//make mysql connections
var databaseConfig = config.database;
var connection = mysql.createConnection({
	host: databaseConfig.host,
	port: databaseConfig.port,
	user: databaseConfig.user.username,
	password: databaseConfig.user.password,
	database: databaseConfig.name
});

connection.connect(function(err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }


  console.log('Connected to the ' + databaseConfig.name + ' database on port ' + databaseConfig.port);
});

//Shortcut function
function queryDatabase(sql, onSuccess){
	connection.query(sql, function(err, results){
		if(err){
			console.log('Database error has ocurred. Error: ' + err);
			return;
		}

		onSuccess(results);
		
	});
}

function usergroupIdOfAccesstoken(accesstoken, onSuccess){
	var sql = squel.select('fk_usergroup').from('user').where('accesstoken = "' + accesstoken + '"');
	queryDatabase(sql.toString, function(results){
		if(results.length == 0){
			res.send("Token not found");
		} else {
			onSuccess(results[0]);
		}
	});
}

app.use(cors());
app.use(bodyParser.json());


//login function
app.post('/login', function(req,res){
	var sql = squel.select().from('user').where('username = "' + req.body.username + '"').where('password = "' + req.body.username + '"');
	console.log(sql.toString());
	queryDatabase(sql.toString(), function(results){
		if(results.length == 0){
			res.send("Login failed");
		} else {
			res.send(results);
			var generatedToken = hat();
			sql = squel.update().table('user').set('accesstoken = "'+generatedToken+'"').where('id = ' + results[0].id);
			queryDatabase(sql.toString(), function(succesResults){
				sql = squel.select().from('user').where('id' = results[0].id); 
				queryDatabase(sql.toString(), function(results){res.send(results)});
			});
		}
	});
});

//catch all requests
app.all('*', function(req, res){
	console.log('Request done with url: ' + req.url);
	
	//split the url and remove all empty strings in array
	var splittedUrl = req.url.split('/');
	removeFromArray(splittedUrl, '');

	//check if the url is valid
	for (var i = 0; i < splittedUrl.length; i=i+2) {
		var urlPart = schema.tables[splittedUrl[i]];
		if(_(urlPart).isUndefined()){
				res.send("Niet geldig!!");	
		}
	};

	//build up a sql query
	var sql; 

	switch (splittedUrl.length){
		case 1:
			sql = squel.select().from(splittedUrl[0]);
			break;
		case 2:
			sql = squel.select().from(splittedUrl[0]);
			sql.where('id = ' + splittedUrl[1]);
			break;
		case 3:
			splittedUrl.reverse();
			sql = squel.select().from(splittedUrl[0]);
			sql.where('fk_'+splittedUrl[2] + ' = ' + splittedUrl[1]);
			break;
	}	

	console.log(sql);
	queryDatabase(sql.toString(), function(results){res.send(results)});
});





function removeFromArray(array, shouldBeRemoved){
	for (var i=array.length-1; i>=0; i--) {
	    if (array[i] === shouldBeRemoved) {
	        array.splice(i, 1);
	    }
	}
}



//Listen on port 3000
app.listen(3000);

