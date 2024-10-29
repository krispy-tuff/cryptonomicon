<template>
  <section>
    <div class="flex">
      <div class="max-w-xs">
        <label for="wallet" class="block text-sm font-medium text-gray-700"
          >Тикер
        </label>
        <div class="mt-1 relative rounded-md shadow-md">
          <input
            v-model="ticker"
            @keydown.enter="addTicker(ticker)"
            type="text"
            name="wallet"
            id="wallet"
            class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
            placeholder="Например DOGE"
          />
        </div>
        <div
          v-if="hints.length"
          class="flex bg-white p-1 rounded-md shadow-md flex-wrap"
        >
          <span
            v-for="(hint, idx) in hints"
            :key="idx"
            @click="addTicker(hint)"
            class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer"
          >
            {{ hint }}
          </span>
        </div>
        <div v-if="reoccurence" class="text-sm text-red-600">
          Такой тикер уже добавлен
        </div>
      </div>
    </div>
    <add-ticker-button @click="addTicker(ticker)" :disabled="!canAdd" />
  </section>
</template>

<script>
import AddTickerButton from "./AddTickerButton.vue";

export default {
  name: "AddTicker",

  components: {
    AddTickerButton: AddTickerButton,
  },

  emits: {
    coinsLoaded: null,
    addTicker: (ticker) => ticker !== "",
    tickerChange: null,
  },

  props: {
    reoccurence: {
      type: Boolean,
      required: false,
      default: false,
    },
  },

  async created() {
    const c = await fetch(
      `https://min-api.cryptocompare.com/data/all/coinlist?summary=true`
    );
    const tempCoins = await c.json();
    for (const coin in tempCoins.Data) {
      this.coins.push({
        fullName: tempCoins.Data[coin].FullName,
        shortName: tempCoins.Data[coin].Symbol,
      });
    }
    this.$emit("coinsLoaded");
  },

  data() {
    return {
      ticker: "",
      coins: [],
    };
  },

  computed: {
    hints() {
      const hints = [];
      if (this.ticker !== "") {
        breakpoint: for (const coin of this.coins) {
          inner: for (const name in coin) {
            if (
              coin[name].includes(this.ticker) ||
              coin[name].includes(this.ticker.toUpperCase())
            ) {
              hints.push(coin.shortName);
              break inner;
            }
          }
          if (hints.length >= 4) break breakpoint;
        }
      }
      return hints;
    },

    canAdd() {
      return this.ticker !== "";
    },
  },

  methods: {
    addTicker(ticker) {
      this.$emit("addTicker", ticker);
      this.$nextTick().then(() => {
        if (!this.reoccurence) {
          this.ticker = "";
        }
      });
    },
  },

  watch: {
    ticker() {
      this.$emit("tickerChange");
    },
  },
};
</script>
