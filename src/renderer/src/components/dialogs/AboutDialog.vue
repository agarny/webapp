<template>
  <BaseDialog header=" " style="width: 39rem">
    <div class="space-y-7">
      <div class="text-center">
        <div class="text-3xl font-bold">OpenCOR {{ version }}</div>
        <div v-if="electronApi !== undefined" class="text-xl italic font-bold">{{ electronApi.operatingSystem() }}</div>
        <div class="text-sm italic">Copyright {{ constants.COPYRIGHT }}</div>
      </div>
      <div class="space-y-2">
        <div>
          <a href="https://opencor.ws/" target="_blank" rel="noopener">OpenCOR</a> is a frontend to
          <a href="https://opencor.ws/libopencor/" target="_blank" rel="noopener">libOpenCOR</a> {{ locApi.version() }},
          a library that can be used to organise, edit, simulate, and analyse
          <a href="https://cellml.org/" target="_blank" rel="noopener">CellML</a> files.
        </div>
        <div class="space-y-0">
          <div>There are two versions of OpenCOR:</div>

          <ol class="list-decimal list-inside ml-2">
            <li>
              <span class="font-bold">OpenCOR:</span> a desktop application that can be run on
              <a href="https://en.wikipedia.org/wiki/Microsoft_Windows" target="_blank" rel="noopener">Windows</a>,
              <a href="https://en.wikipedia.org/wiki/Linux" target="_blank" rel="noopener">Linux</a>, and
              <a href="https://en.wikipedia.org/wiki/MacOS" target="_blank" rel="noopener">macOS</a>; and
            </li>
            <li>
              <span class="font-bold">OpenCOR's Web app:</span> a
              <a href="https://en.wikipedia.org/wiki/Web_application" target="_blank" rel="noopener">Web app</a> that
              can be run using a Web browser.
            </li>
          </ol>
        </div>
        <div>
          The main difference between the two versions is that models in OpenCOR are compiled while they are interpreted
          in OpenCOR's Web app.
        </div>
      </div>
    </div>
    <template #footer>
      <Button label="OK" autofocus @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { electronApi } from '../../../../electronApi'
import * as locApi from '../../../../libopencor/locApi'

import * as constants from '../../../../constants'

defineEmits(['close'])

const version = __APP_VERSION__
</script>
