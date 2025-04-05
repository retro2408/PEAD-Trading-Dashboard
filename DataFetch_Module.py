
"""
This file is the DataFetch Module as mentioned in our Design Document.Please note that in order to use this file, one 
would need Trader Workstation in the correct directory along with the required market data subscriptions in order to 
execute this file. Thus there is no need to execute the file or any code as it only extracts the data - which we have 
already pushed to the github repo. 


This file picks one stock ticker at a time and calls the earnings_dates module to generate the historical price data 
on the specific dates (between the time periods : 16:00 and 17:00) a company released its earnings report.

We tried to make this method generalizable and more modular so that we can just a single list of stocks and populate 
all of them, however due to concurrency, this script can AT MAX return one csv file per ticker at a time. 
The csvs generated are stored as [TICKER_NAME]_Earnings_Data(5M).csv and are further utilized by the backtest.py. 

"""

import sys 
sys.path.insert(0,"")  #Insert Path to your broker's API files in your local directory 
from ibapi.client import EClient
from ibapi.wrapper import EWrapper
from ibapi.contract import Contract
from ibapi.order import Order
from ibapi.execution import *
import time
import threading
import random 
import yfinance as yf
import pandas as pd
from datetime import datetime

today = pd.Timestamp.now(tz='America/New_York').normalize() 


selected = 'GOOGL'
tickerlist = [selected]
ticker_objlist = [] 
ticker_dfs = {} 

for item in tickerlist:
    ticker_objlist.append(yf.Ticker(item))
    
    # Get earnings dates
    ticker_dfs[item] = ticker_objlist[tickerlist.index(item)].get_earnings_dates(64)

    # Convert from America/New_York (UTC-5) to UTC
    ticker_dfs[item].index = ticker_dfs[item].index.tz_convert('UTC')

    # Keep only past earnings dates
    today = pd.Timestamp.now(tz='UTC').normalize()
    ticker_dfs[item] = ticker_dfs[item][ticker_dfs[item].index <= today]

# Print the fixed DataFrame
print(ticker_dfs[selected])

"""
Request Historical OHLCV data (via reqHistoricalData) - https://ibkrcampus.com/ibkr-api-page/trader-workstation-api/#historical-bars
"""
cols = ['ReqID','Time', 'Price' , 'Size']
tickdf = pd.DataFrame(columns = cols)
colums = ['ReqId', 'ticker', 'date', 'Open' , 'High' , 'Low' , 'Close' , 'Volume']
pricedflist = [pd.DataFrame(columns=colums) for _ in range(len(tickerlist))]
# request_ids = range(4102,4102 + len(tickerlist)) 
# req_idlist = [[_ for _ in range(x,x+buffer)] for x in range(4102,4102 + len(tickerlist)*buffer,buffer)]
# request_ticker_map = dict(zip(tickerlist,req_idlist))



print("expected records" , len(ticker_dfs[selected].index)) 

class TradeApp(EWrapper, EClient): 
    def __init__(self): 
        EClient.__init__(self, self) 
        self.data = {}
        self.responses_received = 0 
        self.requests_sent = 1
        
    def historicalData(self, reqId, bar):
        for ticker in tickerlist[0:1] : 
                print(reqId)
                pricedflist[tickerlist.index(ticker)].loc[len(pricedflist[tickerlist.index(ticker)])] = [reqId, ticker, bar.date, bar.open , bar.high , bar.low , bar.close , bar.volume ]
                self.responses_received += 1  # Increment when data is received


            # Stop the loop when all requests are processed

            

def stockContract(symbol, sec_type="STK", currency="USD", exchange="SMART"):
    contract = Contract()
    contract.symbol = ticker
    contract.secType = "STK"
    contract.exchange = "SMART"
    contract.currency = "USD"
    contract.primaryExchange = "NASDAQ"
    return contract

def histData(req_num, contract):

    for ticker in tickerlist : 
            
            mycontract = stockContract(ticker)
            # strused = str(ticker_dfs['GOOGL'].index[0])[0:10].replace('-', '') + "-13:30:00 UTC"
            for dates in ticker_dfs[ticker].index :           

                    app.reqHistoricalData(req_num, 
                                        contract=mycontract,
                                        endDateTime= str(dates)[0:10].replace('-', '') + ' 23:30:00 UTC', 
                                        durationStr='12400 S',
                                        barSizeSetting='5 mins',
                                        whatToShow='Trades',
                                        useRTH=0,                 #0 = Includes data outside of RTH | 1 = RTH data only 
                                        formatDate=1,    
                                        keepUpToDate=0,           #0 = False | 1 = True 
                                        chartOptions=[])	
                    time.sleep(3)      #Sleep function to avoid data leakage due to asynchronous nature of the api 
                    req_num += 1 
                    app.requests_sent += 1 
                    print(str(dates)[0:10].replace('-', '') + ' 21:30:00 UTC')
          
def websocket_con():
    app.run()
    
app = TradeApp()      
app.connect("127.0.0.1", 7496, clientId=random.randint(1,1000)) #randomized client Ids to avoid timeouts

con_thread = threading.Thread(target=websocket_con, daemon=True)
con_thread.start()
time.sleep(1) 

for ticker in tickerlist[0:1]:
    histData(tickerlist[0:1].index(ticker), stockContract(ticker))    #Only one ticker at a time 
   
    
 
pricedflist[0] = pricedflist[0].sort_values(by='ReqId')
for df in pricedflist[0:1] : 
      df.to_csv(f"{df['ticker'][0]}_Earnings_Data(5M).csv")   # Outputs The Extracted Data to csv files
    
    
    
    


