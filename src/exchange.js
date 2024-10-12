/* eslint-disable prettier/prettier */
const API_KEY =
  "d89918fb0e7ae0d5cc575a4cfd4b8078c414a121c0d0471bafa57027b12199d8";
const WS_URL = "wss://streamer.cryptocompare.com/v2";

const MSG_SUB = "5";
const MSG_ACCEPT = "20";
const MSG_REJECT = "429";

let socket = new WebSocket(`${WS_URL}?api_key=${API_KEY}`);
const tickerHandlers = new Map();

const channel = new BroadcastChannel("cryptonomicon");
let channelTickers = [];

let hasSocket = true;

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
  const subscriptions = tickerHandlers.get(tickerName) ?? [];
  tickerHandlers.set(tickerName, [...subscriptions, cb]);
  if (hasSocket) {
    subscribeTickerToWS(tickerName);
  } else {
    channel.postMessage({ ticker: tickerName, action: "subscribe" });
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
  const { TYPE: type, FROMSYMBOL: currency, PRICE: price } = JSON.parse(e.data);
  switch (type) {
    case MSG_SUB: {
      if (channelTickers.find((t) => t === currency)) {
        channel.postMessage({ ticker: currency, price: price });
      }
      const handlers = tickerHandlers.get(currency) ?? [];
      handlers.forEach((cb) => cb(price));
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
  }
});

channel.onmessage = (e) => {
  const { ticker: ticker, action: action, price: price } = e.data;
  switch (action) {
    case "subscribe":
      if (!channelTickers.includes(ticker)) channelTickers.push(ticker);
      subscribeTickerToWS(ticker);
      break;
    case "unsubscribe":
      channelTickers = channelTickers.filter((t) => t !== ticker);
      if (!tickerHandlers.has(ticker)) {
        unsubscribeTickerFromWS(ticker);
      }
      break;
    case "closed":
      if (!hasSocket) {
        console.log(socket.readyState);
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
  channel.postMessage({ action: "closed" });
  socket.close();
});
