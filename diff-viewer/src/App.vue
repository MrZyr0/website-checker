<template>
  <main
    class="p-4 pb-16"
    :class="{
      'overflow-hidden h-screen': state.isModalDisplaying === true,
    }"
  >
    <h1 class="text-3xl text-center text-white">Image diff viewer</h1>
    <p class="text-center">
      {{ state.actualFileName }} ({{ state.actualIndex }} /
      {{ state.nbOfScreenshots }})
    </p>
    <hr class="w-1/2 mx-auto my-2" />
    <dialog
      v-if="state.actualFileName && state.actualFileName !== 'FINISHED'"
      :open="state.isModalDisplaying && state.actualFileName !== 'FINISHED'"
      class="fixed inset-0 z-10 items-center justify-center bg-black"
      :class="{
        hidden: state.isModalDisplaying === false,
        flex: state.isModalDisplaying === true,
      }"
    >
      <img
        class="max-w-full max-h-full"
        :src="`http://localhost:8081/2%23aws/${state.actualFileName
          .replaceAll('.png', '-diff-with-1%23prod.png')
          .replaceAll('?', '%3F')}`"
        alt=""
      />
    </dialog>
    <div
      class="flex py-5"
      v-if="state.actualFileName && state.actualFileName !== 'FINISHED'"
    >
      <aside class="flex flex-col items-center w-1/2 mr-2">
        <img
          :src="`http://localhost:8081/1%23prod/${state.actualFileName.replaceAll(
            '?',
            '%3F'
          )}`"
          alt=""
        />
      </aside>
      <aside class="flex flex-col items-center border-l-2 border-l-black w-1/2">
        <img
          :src="`http://localhost:8081/2%23aws/${state.actualFileName.replaceAll(
            '?',
            '%3F'
          )}`"
          alt=""
        />
      </aside>
    </div>
    <pre
      v-if="state.actualFileName === 'FINISHED'"
      class="flex items-center justify-center select-all"
      >{{ state.urlsToCheck }}</pre
    >
    <div
      class="fixed right-0 bottom-0 left-0 z-20 flex items-center py-2 bg-black"
    >
      <button
        class="border border-black dark:border-white px-4 py-2 ml-auto"
        :disabled="state.actualFileName === 'FINISHED'"
        @click="next('OK')"
      >
        OK
      </button>
      <button
        class="border border-black dark:border-white px-4 py-2 ml-2"
        :disabled="state.actualFileName === 'FINISHED' || !state.actualFileName"
        @click="state.isModalDisplaying = !state.isModalDisplaying"
      >
        Display diff
      </button>
      <button
        class="border border-black dark:border-white px-4 py-2 ml-2"
        :disabled="
          state.actualIndex === 0 || state.actualFileName === 'FINISHED'
        "
        @click="prev()"
      >
        Prev.
      </button>
      <button
        class="border border-black dark:border-white px-4 py-2 ml-2 mr-auto"
        :disabled="state.actualFileName === 'FINISHED'"
        @click="next('KO')"
      >
        KO
      </button>
    </div>
  </main>
</template>

<script setup>
import { reactive, onMounted } from "vue";

const state = reactive({
  diffReport: undefined,
  urlsToCheck: [],
  actualFileName: "",
  actualIndex: 0,
  nbOfScreenshots: 0,
  isModalDisplaying: false,
});

onMounted(async () => {
  const res = await fetch("http://localhost:8081/report");

  const data = await res.text();

  state.diffReport = JSON.parse(data).filter(
    ({ screenshotName }) => screenshotName && screenshotName.includes("laptop")
  );
  state.nbOfScreenshots = state.diffReport.length;
  state.actualFileName = state.diffReport[state.actualIndex].screenshotName;
});

function prev() {
  if (state.actualIndex === 0) {
    return;
  }

  state.actualIndex -= 1;
  state.actualFileName = state.diffReport[state.actualIndex].screenshotName;
  state.urlsToCheck = state.urlsToCheck.filter(
    (url) => url !== state.actualFileName
  );
}

function next(action) {
  if (
    state.actualIndex >= state.diffReport.length - 1 ||
    !state.diffReport[state.actualIndex + 1]["screenshotName"]
  ) {
    state.urlsToCheck = [
      ...new Set(
        state.urlsToCheck.map(
          (url) =>
            `https://www.vecteur-air.com/${url
              .replaceAll("■", "/")
              .replaceAll("laptop.png", "")
              .replaceAll("mobile.png", "")}`
        )
      ),
    ];
    state.actualFileName = "FINISHED";
    return;
  }

  if (action === "OK") {
    state.actualIndex += 1;
    state.actualFileName = state.diffReport[state.actualIndex].screenshotName;
    return;
  }

  state.urlsToCheck = [
    ...state.urlsToCheck,
    state.diffReport[state.actualIndex].screenshotName,
  ];
  state.actualIndex += 1;
  state.actualFileName = state.diffReport[state.actualIndex].screenshotName;
}
</script>

<style>
@import "./assets/base.css";
</style>
