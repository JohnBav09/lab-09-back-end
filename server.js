'use strict'

//require() is an import statement built into node.js - it reads complex files.
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
require('dotenv').config();
const pg = require('pg');

const app = express();
app.use(cors());

//postgres client
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', (error) => console.error(error));

const PORT = process.env.PORT;

//============= Constructor Functions ============

//location
function Location(query, format, lat, lng) {
  this.search_query = query;
  this.formatted_query = format;
  this.latitude = lat;
  this.longitude = lng;
}

//weather
function Day (summary, time) {
  this.forecast = summary;
  this.time = new Date(time *1000).toDateString();
}

// events
function Event (link, name, event_date, summary){
  this.link = link;
  this.name = name;
  this.event_date = new Date(event_date).toDateString();
  this.summary = summary;
}

// yelp


// movies

// =========== TARGET LOCATION from API ===========

app.get('/location', (request, response) => {
  const searchQuery = request.query.data; //request.query is part of the request (NewJohn's hand) and is a vector for questions. It lives in the URL, public info. Postal service of internet.

  client.query(`SELECT * FROM locations WHERE search_query=$1`, [searchQuery]).then(sqlResult => {

    //if stuff:
    if(sqlResult.rowCount >0){
      console.log('Found data in database')
      response.send(sqlResult.rows[0]);
    } else {

      console.log('nothing found in database, asking google')
      const urlToVisit = `https://maps.googleapis.com/maps/api/geocode/json?address=${searchQuery}&key=${process.env.GEOCODE_API_KEY}`;
      
      superagent.get(urlToVisit).then(responseFromSuper => {

        const geoData = responseFromSuper.body;
        const specificGeoData = geoData.results[0];
        console.log(geoData);
        const formatted = specificGeoData.formatted_address;
        
        const lat = specificGeoData.geometry.location.lat;
        const lng = specificGeoData.geometry.location.lng;
        
        const newLocation = new Location(searchQuery, formatted, lat, lng);
        //start the response cycle
        
        //Within superagent, creating placeholders so we can add information to database
        
        //action(insert) "into" where (values)
        const sqlQueryInsert = `INSERT INTO locations
        (search_query, formatted_query, latitude, longitude)
        VALUES
        ($1, $2, $3, $4)`;

        const valuesArray = [newLocation.search_query, newLocation.formatted_query, newLocation.latitude, newLocation.longitude];


        //sqlQueryInsert is the affore mentioned string, which is sql script(instructions)
        //values Array is that array
        //client.query combies the string and array, and per the string's instructions, creates rows, and then fills the rows with the array's contents
        
        client.query(sqlQueryInsert, valuesArray);
        
        response.send(newLocation);

      }).catch(error => {
        response.status(500).send(error.message);
        console.error(error);
      })

    }      
  })
})

    
// =========== TARGET WEATHER from API ===========
    
app.get('/weather', getWeather)
  
function getWeather(request, response){

  const localData = request.query.data;
  // console.log(localData);
  
  client.query(`SELECT * FROM weather WHERE search_query=$1`, [localData.search_query]).then(sqlResult => {
    
    let notOld = true;
    if(sqlResult.rowCount > 0){
      const age =sqlResult.rows[0].created_at;  
      // 150000000000
      const ageInSeconds = (date.now()- age) /
      1000; // 15
      if(ageInSeconds > 15){
        notOld = false
        client.query('DELETE FROM weathers WHERE search_query=$1', localData.search_query); 
      }
      console.log('age in seconds', ageInSeconds)
      console.log('found weather stuff in database')

      response.send(sqlResult.rows[0]);
      console.log(sqlResult.rows);

    } else {
      console.log('did not find in database, googling now!');

      const urlDarkSky = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${localData.latitude},${localData.longitude}`;


      superagent.get(urlDarkSky).then(responseFromSuper => {

        const weatherData = responseFromSuper.body;
        const eightDays = weatherData.daily.data;
        const formattedDays = eightDays.map(day => new Day(day.summary, day.time));

        
        // Database Data to add
        formattedDays.forEach(day => {

          const sqlQueryInsert = `INSERT INTO weather
      (search_query, forecast, time)
      VALUES
      ($1, $2, $3)`;

          const valuesArray = [localData.search_query, day.forecast, day.time];
          client.query(sqlQueryInsert, valuesArray);
          console.log('accessing values array', valuesArray);
        })
      

        response.send(formattedDays)
      }).catch(error => {
        response.status(500).send(error.message);
        console.error(error);
      })
    }
  });
}


// ============ EVENTBRITE from API ==============

app.get('/events', getEvents)

function getEvents(request, response){

  let eventData = request.query.data;

  // Database squery - check the database for data
  client.query(`SELECT * FROM events WHERE search_query=$1`, [eventData.search_query]).then(sqlResult => {
    
    let notOld = true;
    if(sqlResult.rowCount > 0){
      const age =sqlResult.rows[0].created_at;  
      // 150000000000
      const ageInSeconds = (date.now()- age) /
      1000; // 15
      if(ageInSeconds > 86400 ){
        notOld = false
        client.query('DELETE FROM events WHERE search_query=$1', localData.search_query); 
      }
      console.log('age in seconds', ageInSeconds)
    if(sqlResult.rowCount === 0){
      console.log('data from internet');

      const urlfromEventbrite = `https://www.eventbriteapi.com/v3/events/search/?sort_by=date&location.latitude=${eventData.latitude}&location.longitude=${eventData.longitude}&token=${process.env.EVENTBRITE_API_KEY}`;

      superagent.get(urlfromEventbrite).then(responseFromSuper => {
        // console.log(responseFromSuper.body)
    
        const eventbriteData = responseFromSuper.body.events;
        const formattedEvents = eventbriteData.map(event => new Event(event.url, event.name.text, event.start.local, event.description.text));
  
        response.send(formattedEvents);

        // Data structure to insert into database with where it goes
        formattedEvents.forEach(event => {
          const insertEvent = `
          INSERT INTO events
          (name, search_query, link, event_date, summary)
          VALUE
          ($1, $2, $3, $4, $5);`
          client.query(insertEvent, [event.name, eventData.search_query, event.link, event.event_date, event.summary]);
        });

      }).catch(error => {
        response.status(500).send(error.message);
        console.error(error);
      })

    } else {
      console.log('data already exists in event database');
      'use the data that exists in the db';
      response.send(sqlResult.rows);
    }
  };
}


// ============ YELP from API ==============

app.get('/Yelp', getYelp)

function getYelp(request, response){

  let eventData = request.query.data;

  // Database squery - check the database for data
  client.query(`SELECT * FROM Yelp WHERE search_query=$1`, [eventData.search_query]).then(sqlResult => {
    
    let notOld = true;
    if(sqlResult.rowCount > 0){
      const age =sqlResult.rows[0].created_at;  
      // 150000000000
      const ageInSeconds = (date.now()- age) /
      1000; // 15
      if(ageInSeconds > 43200 ){
        notOld = false
        client.query('DELETE FROM Yelp WHERE search_query=$1', localData.search_query); 
      }
      console.log('age in seconds', ageInSeconds)
    if(sqlResult.rowCount === 0){
      console.log('data from internet');

      const urlfromEventbrite = `https://www.eventbriteapi.com/v3/Yelp/search/?sort_by=date&location.latitude=${eventData.latitude}&location.longitude=${eventData.longitude}&token=${process.env.EVENTBRITE_API_KEY}`;

      superagent.get(urlfromEventbrite).then(responseFromSuper => {
        // console.log(responseFromSuper.body)
    
        const eventbriteData = responseFromSuper.body.Yelp;
        const formattedYelp = eventbriteData.map(event => new Event(event.url, event.name.text, event.start.local, event.description.text));
  
        response.send(formattedYelp);

        // Data structure to insert into database with where it goes
        formattedYelp.forEach(Yelp => {
          const insertYelp = `
          INSERT INTO Yelp
          (name, image_url, price, rating, url , created_at , location_ id )
          VALUE
          ($1, $2, $3, $4, $5 ,$6 ,$7);`
          client.query(insertYelp, [Yelp.name, YelpData.image_url, Yelp.price, Yelp.rating, Yelp.url, Yelp.created_at, yelp.location_id]);
        });

        const url = `https://api.yelp.com/v3/businesses/search?location=${request.query.data.search_query}`;

        superagent.get(url)
          .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
          .then(result => {
            const yelpSummaries = result.body.businesses.map(business => {
              const review = new Yelp(business);
              review.save(request.query.data.id);
              return review;
            });
  
            response.send(yelpSummaries);
          })
          .catch(error => handleError(error, response));
      }
    })
  }


// ============ Movies from API ==============

app.get('/Movies', getMovies)

function getMovies(request, response){

  let MoviesData = request.query.data;

  // Database squery - check the database for data
  client.query(`SELECT * FROM Movies WHERE search_query=$1`, [MoviesData.search_query]).then(sqlResult => {
    
    let notOld = true;
    if(sqlResult.rowCount > 0){
      const age =sqlResult.rows[0].created_at;  
      // 150000000000
      const ageInSeconds = (date.now()- age) /
      1000; // 15
      if(ageInSeconds > 1210000 ){
        notOld = false
        client.query('DELETE FROM Movies WHERE search_query=$1', localData.search_query); 
      }
      console.log('age in seconds', ageInSeconds)
    if(sqlResult.rowCount === 0){
      console.log('data from internet');

      const urlfromMovie = `=https:api.themoviedb.org/3/search/movie/?api_key=${process.env.MOVIE_API_KEY}&language=en-US&page=1&query=${request.query.data.search_query}`;

      superagent.get(urlfromMovie).then(responseFromSuper => {
        // console.log(responseFromSuper.body)
    
        const MovieData = responseFromSuper.body.Movies;
        const formattedMovies = MovieData.map(event => new Event(event.url, event.name.text, event.start.local, event.description.text));
  
        response.send(formattedMovies);

        // Data structure to insert into database with where it goes
        formattedMovies.forEach(event => {
          const insertMovies = `
          INSERT INTO Movies
          (title, overview, average_votes, total_votes, image_url, popularity, released_on, created_at, location_id)
          VALUE
          ($1, $2, $3, $4, $5);`
          client.query(insertMovies, [movies.title, movies.overview, movies.average_votes, movies.total_votes, movies.img_url, movies.popularity, movies.released_on, movies.created_at, movies.location_id});

      }).catch(error => {
        response.status(500).send(error.message);
        console.error(error);
      })

    } else {
      console.log('data already exists in event database');
      'use the data that exists in the db';
      response.send(sqlResult.rows);
    }
  };
}


// ====================================

// app.listen(PORT, () => {
//   console.log(`app is running on ${PORT}`);


// })
// class notes

// API is a server that lives on the internet. Places where code lives.
//1. Go to google api console developer website.
// 2. Copy URL in Postman and in server.js under /location
// 3. install superagent = require('superagent') ---> NOT EXPRESS (recieves http request, ears of operation). SUPERAGENT is the mouth, it talks to the internet over http.
// 4. rnpm install -S superagent
//5. superagent.get('url from string')
//......
//10. The dynamic part of the code is in the addess.


//lab tomorrow
//1. Get location (just did in class) and weather and eventbite data from the internet.
//2. Trello board has everything I need for days instructions.
