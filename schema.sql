DROP TABLE IF EXISTS locations;

CREATE TABLE locations (
   id SERIAL PRIMARY KEY,
   /* get data from constructor function */
   search_query VARCHAR(255),
   formatted_query VARCHAR(255),
   latitude NUMERIC (10, 7), /* can specify length allowed */
   longitude NUMERIC (10, 7)
);

DROP TABLE IF EXISTS weather;

CREATE TABLE weather (
   id SERIAL PRIMARY KEY,
   search_query VARCHAR(255),
   forecast VARCHAR(255),
   time VARCHAR(255)
   );

DROP TABLE IF EXISTS events;

CREATE TABLE events (
   id SERIAL PRIMARY KEY,
   name VARCHAR(255),
   search_query VARCHAR(255),
   link VARCHAR(255),
   event_date VARCHAR(255),
   summary TEXT
   );

DROP TABLE IF EXISTS yelps 

CREATE TABLE yelps (
  id SERIAL PRIMARY KEY, 
  name VARCHAR(255), 
  image_url VARCHAR(255), 
  price CHAR(5), 
  rating NUMERIC(2,1), 
  url VARCHAR(255),
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id) 
);

DROP TABLE IF EXISTS movies

CREATE TABLE movies ( 
  id SERIAL PRIMARY KEY, 
  title VARCHAR(255), 
  overview VARCHAR(1000), 
  average_votes NUMERIC(4,2), 
  total_votes INTEGER, 
  image_url VARCHAR(255), 
  popularity NUMERIC(6,4), 
  released_on CHAR(10),
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id) 
);
