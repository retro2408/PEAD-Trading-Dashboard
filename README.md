# Build the Client
cd client
npm run build

# Start the Server
cd server
python app.py

# Access the Application
http://localhost:5000

# Guide for the PEAD(LiveScript)[GOOGL]
In order to get the historical data (income statement, balance sheets and cashflow statements) for GOOGLE we used AlphaVantage API, the API
key for the same has been removed from the code. For regular access to those datasets we use the csv files which we stored the data from the API in. 

Secondly, for the third component where we are connecting to the broker (IBKR) using their API , the key for that has been removed as well.
