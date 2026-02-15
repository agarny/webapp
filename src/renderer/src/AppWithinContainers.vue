<template>
  <div class="h-screen">
    <Splitter class="h-full" layout="vertical">
      <SplitterPanel class="flex items-center justify-center bg-blue-500" :size="15">Top panel...</SplitterPanel>
      <SplitterPanel :size="50">
        <Splitter>
          <SplitterPanel class="flex items-center justify-center bg-red-500" :size="15">Left panel...</SplitterPanel>
          <SplitterPanel :size="50">
            <OpenCOR />
          </SplitterPanel>
          <SplitterPanel class="flex items-center justify-center bg-red-500" :size="35">Right panel...</SplitterPanel>
        </Splitter>
      </SplitterPanel>
      <SplitterPanel class="flex items-center justify-center bg-blue-500" :size="35">Bottom panel...</SplitterPanel>
    </Splitter>
  </div>
</template>

<style>
  @import "tailwindcss/preflight.css" layer(base);
</style>
