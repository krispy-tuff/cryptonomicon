<template>
  <div class="container mx-auto flex flex-col bg-gray-100 p-4">
    <div
      v-if="!coinsLoaded"
      class="fixed w-100 h-100 opacity-80 bg-purple-800 inset-0 z-50 flex items-center justify-center"
    >
      <svg
        class="animate-spin -ml-1 mr-3 h-12 w-12 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
    <add-ticker
      :reoccurence="reoccurence"
      @ticker-change="reoccurence = false"
      @add-ticker="(t) => addTicker(t)"
      @coins-loaded.once="coinsLoaded = true"
    />
    <div class="container">
      <section v-if="tickers.length">
        <hr class="w-full border-t border-gray-600 my-4" />
        <div class="flex">
          <div class="max-w-xs">
            <label for="wallet" class="block text-sm font-medium text-gray-700"
              >Фильтр
            </label>
            <div class="mt-1 relative rounded-md shadow-md">
              <input
                v-model="filter"
                type="text"
                name="wallet"
                id="wallet"
                class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
              />
              <button
                v-if="filter"
                @click="filter = ''"
                type="button"
                class="my-4 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Очистить
              </button>
            </div>
          </div>
        </div>
        <button
          v-if="page > 1"
          @click="page--"
          type="button"
          class="my-4 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Назад
        </button>
        <button
          v-if="hasNextPage"
          :class="{
            'mx-3': page !== 1,
          }"
          @click="page++"
          type="button"
          class="my-4 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Вперед
        </button>
      </section>
      <template v-if="paginatedTickers.length">
        <hr class="w-full border-t border-gray-600 my-4" />
        <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div
            v-for="t in paginatedTickers"
            :key="t.name"
            @click="selectTicker(t)"
            :class="{
              'border-4': t === selectedTicker,
              'bg-red-100': t.value === null,
              'bg-white': t.value,
            }"
            class="overflow-hidden shadow rounded-lg border-purple-800 border-solid cursor-pointer"
          >
            <div class="px-4 py-5 sm:p-6 text-center">
              <dt class="text-sm font-medium text-gray-500 truncate">
                {{ t.name }} - USD
              </dt>
              <dd class="mt-1 text-3xl font-semibold text-gray-900">
                {{ formatPrice(t.value) }}
              </dd>
            </div>
            <div class="w-full border-t border-gray-200"></div>
            <button
              @click.stop="removeTicker(t)"
              class="flex items-center justify-center font-medium w-full bg-gray-100 px-4 py-4 sm:px-6 text-md text-gray-500 hover:text-gray-600 hover:bg-gray-200 hover:opacity-20 transition-all focus:outline-none"
            >
              <svg
                class="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="#718096"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                ></path></svg
              >Удалить
            </button>
          </div>
        </dl>
      </template>
      <ticker-graph
        v-if="selectedTicker && selectedTicker.value !== null"
        :tickerName="selectedTicker.name"
        :tickerPrice="selectedTicker.value"
        @close-graph="selectedTicker = null"
      />
    </div>
  </div>
</template>

<script>
import { subscribeTicker, unsubscribeTicker } from "./exchange";
import AddTicker from "./components/AddTicker.vue";
import TickerGraph from "./components/TickerGraph.vue";

export default {
  name: "App",

  components: {
    AddTicker: AddTicker,
    TickerGraph: TickerGraph,
  },

  created() {
    //localStorage.removeItem("cryptonomicon-list");
    const tickersData = localStorage.getItem("cryptonomicon-list");

    if (tickersData) {
      this.tickers = JSON.parse(tickersData);
      this.tickers.forEach((t) => {
        subscribeTicker(t.name, (newPrice) =>
          this.updateTicker(t.name, newPrice)
        );
      });
    }
  },

  data() {
    return {
      filter: this.getParamsFromURL().filter,

      tickers: [],
      selectedTicker: null,

      coinsLoaded: false,
      page: this.getParamsFromURL().page,

      reoccurence: false,
    };
  },

  computed: {
    filteredTickers() {
      return this.tickers.filter((t) => t.name.includes(this.filter));
    },

    pageFirstIdx() {
      return (this.page - 1) * 6;
    },

    pageLastIdx() {
      return this.page * 6;
    },

    paginatedTickers() {
      return this.filteredTickers.slice(this.pageFirstIdx, this.pageLastIdx);
    },

    hasNextPage() {
      return this.filteredTickers.length > this.pageLastIdx;
    },

    pageStateParams() {
      return { filter: this.filter, page: this.page };
    },
  },

  methods: {
    getParamsFromURL() {
      const urlData = Object.fromEntries(
        new URL(window.location).searchParams.entries()
      );
      return { filter: urlData?.filter ?? "", page: urlData?.page ?? 1 };
    },

    updateTicker(tickerName, newPrice) {
      if (newPrice === null) {
        this.tickers.find((t) => t.name === tickerName).value = newPrice;
        return;
      }
      const price = newPrice ? newPrice : "-";
      this.tickers.find((t) => t.name === tickerName).value = price;
    },

    formatPrice(price) {
      if (price === "-" || price === null) return "-";
      return price > 1 ? price.toFixed(2) : price.toPrecision(2);
    },

    addTicker(tickerName) {
      const currentTicker = { name: tickerName.toUpperCase(), value: "-" };
      if (this.tickers.find((t) => t.name === currentTicker.name)) {
        this.reoccurence = true;
        return;
      }
      this.tickers = [...this.tickers, currentTicker];
      subscribeTicker(currentTicker.name, (newPrice) =>
        this.updateTicker(currentTicker.name, newPrice)
      );
      this.ticker = "";
      if (!this.filteredTickers.find((t) => t.name === currentTicker.name)) {
        this.filter = "";
      }
    },

    removeTicker(tickerToRemove) {
      this.tickers = this.tickers.filter((t) => t !== tickerToRemove);
      unsubscribeTicker(tickerToRemove.name, (newPrice) =>
        this.updateTicker(tickerToRemove.name, newPrice)
      );
      if (this.selectedTicker === tickerToRemove) {
        this.selectedTicker = null;
      }
    },

    selectTicker(tickerToSelect) {
      if (this.selectedTicker === tickerToSelect) {
        this.selectedTicker = null;
      } else {
        this.selectedTicker = tickerToSelect;
      }
    },
  },

  watch: {
    filter() {
      this.filter = this.filter.toUpperCase();
      this.page = 1;
    },

    pageStateParams(value) {
      window.history.pushState(
        null,
        document.title,
        `${window.location.pathname}?filter=${value.filter}&page=${value.page}`
      );
    },

    tickers() {
      localStorage.setItem("cryptonomicon-list", JSON.stringify(this.tickers));
    },

    paginatedTickers() {
      if (this.paginatedTickers.length === 0 && this.page > 1) {
        this.page--;
      }
    },
  },
};
</script>

<style src="./app.css"></style>
