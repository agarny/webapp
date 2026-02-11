<template>
  <BaseDialog header=" " class="w-169">
    <div class="space-y-7">
      <div class="text-center">
        <div class="text-3xl font-bold">OpenCOR {{ currentVersion }}</div>
        <div v-if="electronApi" class="text-xl italic font-bold">{{ electronApi.operatingSystem() }}</div>
        <div class="text-sm italic">Copyright {{ COPYRIGHT }}</div>
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
              <span class="font-bold"><a href="https://github.com/opencor/webapp/releases/latest" target="_blank" rel="noopener">OpenCOR</a>:</span> a desktop application that can be run on
              <a href="https://en.wikipedia.org/wiki/List_of_Intel_processors" target="_blank" rel="noopener">Intel</a>-based and
              <a href="https://en.wikipedia.org/wiki/ARM_architecture_family" target="_blank" rel="noopener">ARM</a>-based
              <a href="https://en.wikipedia.org/wiki/Microsoft_Windows" target="_blank" rel="noopener">Windows</a>,
              <a href="https://en.wikipedia.org/wiki/Linux" target="_blank" rel="noopener">Linux</a>, and
              <a href="https://en.wikipedia.org/wiki/MacOS" target="_blank" rel="noopener">macOS</a> machines; and
            </li>
            <li>
              <span class="font-bold"><a href="https://opencor.ws/app" target="_blank" rel="noopener">OpenCOR's Web app</a>:</span> a
              <a href="https://en.wikipedia.org/wiki/Web_application" target="_blank" rel="noopener">Web app</a> that
              can be run on a Web browser.
            </li>
          </ol>
        </div>
      </div>
    </div>
    <template #footer>
      <Button label="OK" autofocus @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { currentVersion } from '../../common/version.ts';

import { COPYRIGHT } from '../../common/constants.ts';

import { electronApi } from '../../common/electronApi.ts';
import * as locApi from '../../libopencor/locApi.ts';

defineEmits<(event: 'close') => void>();
</script>
