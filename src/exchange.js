/* eslint-disable prettier/prettier */
const API_KEY =
  "d89918fb0e7ae0d5cc575a4cfd4b8078c414a121c0d0471bafa57027b12199d8";

//const API_URL = "https://min-api.cryptocompare.com/data/pricemulti";
const WS_URL = "wss://streamer.cryptocompare.com/v2";
const MSG_ACCEPT = "5";
const MSG_DECLINE = "429";
const socket = new WebSocket(`${WS_URL}?api_key=${API_KEY}`);
const channel = new BroadcastChannel("cryptonomicon");

const tickersHandlers = new Map();
let channelTickers = [];

let hasSocket = true;

// const updateTickers = () => {
//   if (tickersHandlers.size === 0) {
//     return;
//   }
//   loadTickersFromAPI();
// };

// function loadTickersFromAPI() {
//   const params = new URLSearchParams(API_URL.search);
//   params.set("fsyms", [...tickersHandlers.keys()].join(","));
//   params.set("tsyms", "USD");
//   params.set("api_key", API_KEY);
//   fetch(`${API_URL}?${params.toString()}`)
//     .then((r) => r.json())
//     .then((rawData) => {
//       const updatedPrices = Object.fromEntries(
//         Object.entries(rawData).map(([key, value]) => [key, value.USD])
//       );
//       Object.entries(updatedPrices).forEach(([currency, newPrice]) => {
//         const handlers = tickersHandlers.get(currency) ?? [];
//         handlers.forEach((cb) => cb(newPrice));
//       });
//     });
// }

function subscribeTickerToWS(ticker) {
  const message = JSON.stringify({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`],
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

function unsubscribeTickerFromWS(ticker) {
  const message = JSON.stringify({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~USD`],
  });
  socket.send(message);
}

export const subscribeTicker = (tickerName, cb) => {
  const subscriptions = tickersHandlers.get(tickerName) ?? [];
  tickersHandlers.set(tickerName, [...subscriptions, cb]);
  if (hasSocket) {
    subscribeTickerToWS(tickerName);
  } else {
    channel.postMessage({ ticker: tickerName, action: "subscribe" });
  }
};

export const unsubscribeTicker = (tickerName) => {
  tickersHandlers.delete(tickerName);
  if (hasSocket) {
    unsubscribeTickerFromWS(tickerName);
  } else {
    channel.postMessage({ ticker: tickerName, action: "unsubscribe" });
  }
};

//setInterval(updateTickers, 5000);

socket.addEventListener("message", (e) => {
  const { TYPE: type, FROMSYMBOL: currency, PRICE: price } = JSON.parse(e.data);
  if (type !== MSG_ACCEPT && type !== MSG_DECLINE) {
    return;
  }
  if (type === MSG_ACCEPT) {
    if (channelTickers.find((t) => t === currency)) {
      channel.postMessage({ ticker: currency, price: price });
    }
    const handlers = tickersHandlers.get(currency) ?? [];
    handlers.forEach((cb) => cb(price));
  }
  if (type === MSG_DECLINE) {
    hasSocket = false;
  }
});

channel.onmessage = (e) => {
  const { ticker: ticker, action: action, price: price } = e.data;
  if (action) {
    if (action === "subscribe") {
      channelTickers.push(ticker);
      subscribeTickerToWS(ticker);
    } else if (action === "unsubscribe") {
      channelTickers = channelTickers.filter((t) => t !== ticker);
      unsubscribeTickerFromWS(ticker);
    }
  } else if (price) {
    const handlers = tickersHandlers.get(ticker) ?? [];
    handlers.forEach((cb) => cb(price));
  }
};

window.addEventListener("beforeunload", () => {
  socket.close();
});
