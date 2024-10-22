/* eslint-disable prettier/prettier */
const API_KEY =
  "d89918fb0e7ae0d5cc575a4cfd4b8078c414a121c0d0471bafa57027b12199d8";
const WS_URL = "wss://streamer.cryptocompare.com/v2";

const MSG_SUB = "5";
const MSG_ACCEPT = "20";
const MSG_REJECT = "429";
const MSG_NOPAIR = "500";

let socket = new WebSocket(`${WS_URL}?api_key=${API_KEY}`);
const tickerHandlers = new Map();

const channel = new BroadcastChannel("cryptonomicon");
let channelTickers = new Map();

let hasSocket = true;
let btcRate;

function subscribeTickerToWS(ticker, tsym = "USD") {
  const message = JSON.stringify({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~${tsym}`],
  });

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(message);
    return;
  }

  socket.addEventListener(
    "open",
    () => {
      socket.send(message);
    },
    { once: true }
  );
}

function unsubscribeTickerFromWS(ticker, tsym = "USD") {
  const message = JSON.stringify({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~${tsym}`],
  });
  socket.send(message);
}

export const subscribeTicker = (tickerName, cb) => {
  const subscriptions = tickerHandlers.get(tickerName) ?? [];
  tickerHandlers.set(tickerName, [...subscriptions, cb]);
  if (hasSocket) {
    subscribeTickerToWS(tickerName);
  } else {
    channel.postMessage({ ticker: tickerName, action: "subscribe" });
    console.log("Hey!");
  }
};

export const unsubscribeTicker = (tickerName) => {
  tickerHandlers.delete(tickerName);
  if (hasSocket) {
    unsubscribeTickerFromWS(tickerName);
  } else {
    channel.postMessage({ ticker: tickerName, action: "unsubscribe" });
  }
};

socket.addEventListener("message", (e) => {
  const {
    TYPE: type,
    FROMSYMBOL: currency,
    TOSYMBOL: tsym,
    PRICE: price,
    PARAMETER: param,
    MESSAGE: message,
  } = JSON.parse(e.data);
  switch (type) {
    case MSG_SUB: {
      if (tsym === "USD") {
        if (currency === "BTC") {
          btcRate = price;
        }
        handleUpdate(currency, price);
      } else if (tsym === "BTC") {
        handleUpdate(currency, price * btcRate);
      }
      break;
    }
    case MSG_ACCEPT:
      hasSocket = true;
      for (const key of [...tickerHandlers.keys()]) {
        subscribeTickerToWS(key);
      }
      break;
    case MSG_REJECT:
      socket.close();
      hasSocket = false;
      for (const ticker of tickerHandlers.keys()) {
        channel.postMessage({ ticker: ticker, action: "subscribe" });
      }
      break;
    case MSG_NOPAIR: {
      if (message === "INVALID_SUB") {
        const btcEntries = channelTickers.get("BTC") ?? 0;
        const curr = param?.slice(9, -4);
        console.log("here: " + curr);
        if (param?.slice(-3) === "USD") {
          if (btcEntries === 0 && !tickerHandlers.has("BTC")) {
            subscribeTickerToWS("BTC");
          }
          channelTickers.set("BTC", btcEntries + 1);
          subscribeTickerToWS(curr, "BTC");
        } else if (param?.slice(-3) === "BTC") {
          handleUpdate(curr, null);
          if (btcEntries > 1) {
            channelTickers.set("BTC", btcEntries - 1);
          } else {
            if (!tickerHandlers.has("BTC")) unsubscribeTickerFromWS("BTC");
            channelTickers.delete("BTC");
          }
        }
      }
      break;
    }
  }
});

function handleUpdate(currency, price) {
  if (channelTickers.has(currency)) {
    channel.postMessage({ ticker: currency, price: price });
  }
  const handlers = tickerHandlers.get(currency) ?? [];
  handlers.forEach((cb) => cb(price));
}

channel.onmessage = (e) => {
  const { ticker: ticker, action: action, price: price } = e.data;
  const instances = channelTickers.get(ticker) ?? 0;
  switch (action) {
    case "subscribe":
      if (instances === 0 && !tickerHandlers.has(ticker))
        subscribeTickerToWS(ticker);
      channelTickers.set(ticker, instances + 1);
      break;
    case "unsubscribe":
      if (instances > 1) {
        channelTickers.set(ticker, instances - 1);
      } else {
        channelTickers.delete(ticker);
        if (!tickerHandlers.has(ticker)) {
          unsubscribeTickerFromWS(ticker);
        }
      }
      break;
    case "closed":
      if (!hasSocket) {
        setTimeout(() => {
          window.location.reload();
        }, Math.floor(Math.random() * 1000));
      }
      break;
    default:
      if (price) {
        const handlers = tickerHandlers.get(ticker) ?? [];
        handlers.forEach((cb) => cb(price));
      }
  }
};

window.addEventListener("beforeunload", () => {
  if (hasSocket) {
    channel.postMessage({ action: "closed" });
    socket.close();
  } else {
    for (const ticker in tickerHandlers.keys()) {
      channel.postMessage({ ticker: ticker, action: "unsubscribe" });
    }
  }
});
