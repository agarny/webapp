<template>
  <BaseDialog header="Interactive Mode Settings" class="w-210 h-180"
    @keydown.prevent.enter="onOk"
    @cancel="onCancel"
  >
    <div class="h-full flex flex-col">
      <Tabs v-model:value="activeTab" class="settings-tabs min-h-0">
        <TabList class="mb-2">
          <Tab value="simulation">
            <i class="pi pi-clock mr-2"></i>Simulation
          </Tab>
          <Tab value="solvers">
            <i class="pi pi-calculator mr-2"></i>Solvers
          </Tab>
          <Tab value="interactive">
            <i class="pi pi-sliders-h mr-2"></i>Interactive
          </Tab>
          <Tab value="miscellaneous">
            <i class="pi pi-bars mr-2"></i>Miscellaneous
          </Tab>
        </TabList>
        <TabPanels>
          <!-- Simulation -->

          <TabPanel value="simulation" class="h-full">
            <div class="settings-section h-full flex flex-col">
              <!-- Section description -->

              <div class="section-header">
                <i class="pi pi-clock text-primary"></i>
                <div>
                  <h3 class="section-title">Simulation</h3>
                  <p class="section-description">Configure the starting and ending points of the simulation, as well as its point interval.</p>
                </div>
              </div>

              <!-- Simulation settings -->

              <div class="settings-form">
                <div class="form-row">
                  <InputScientificNumber v-model="localSettings.simulation.startingPoint" class="form-field"
                    :label="`Starting point (${voiUnit})`"
                    size="small"
                  />
                  <InputScientificNumber v-model="localSettings.simulation.endingPoint" class="form-field"
                    :label="`Ending point (${voiUnit})`"
                    size="small"
                  />
                </div>
                <div class="form-row">
                  <InputScientificNumber v-model="localSettings.simulation.pointInterval" class="form-field"
                    :label="`Point interval (${voiUnit})`"
                    size="small"
                  />
                  <div class="form-field self-stretch">
                    <div v-if="!simulationSettingsIssues.length" class="form-field items-center text-muted-color text-sm">
                      <i class="pi pi-info-circle mr-2"></i>
                      <span>This will result in {{ numberOfDataPoints }} data points.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- Solvers -->

          <TabPanel value="solvers" class="h-full">
            <div class="settings-section h-full flex flex-col">
              <!-- Section description -->

              <div class="section-header">
                <i class="pi pi-calculator text-primary"></i>
                <div>
                  <h3 class="section-title">Solvers</h3>
                  <p class="section-description">Configure CVODE's maximum step (additional settings will be added in the future).</p>
                </div>
              </div>

              <!-- Solvers settings -->

              <div class="settings-form">
                <div class="form-row">
                  <InputScientificNumber v-model="localSettings.solvers.cvodeMaximumStep" class="form-field"
                    :label="`CVODE's maximum step (${voiUnit})`"
                    size="small"
                  />
                  <div class="form-field self-stretch flex items-center">
                    <div class="form-field items-center text-muted-color text-sm">
                      <i class="pi pi-info-circle mr-2"></i>
                      Set to 0 to let CVODE choose a suitable step.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- Interactive -->

          <TabPanel value="interactive" class="h-full">
            <div class="h-full flex flex-col">
              <Tabs v-model:value="activeInteractiveTab" class="min-h-0">
                <TabList class="mb-2">
                  <Tab value="simulationInputs">
                    <i class="pi pi-sign-in mr-2"></i>Simulation inputs
                    <span class="ml-2 badge">{{ localSettings.interactive.uiJson.input.length }}</span>
                  </Tab>
                  <Tab value="modelParameters">
                    <i class="pi pi-list mr-2"></i>Model parameters
                    <span class="ml-2 badge">{{ localSettings.interactive.uiJson.parameters.length }}</span>
                  </Tab>
                  <Tab value="simulationData">
                    <i class="pi pi-database mr-2"></i>Simulation data
                    <span class="ml-2 badge">{{ localSettings.interactive.uiJson.output.data.length }}</span>
                  </Tab>
                  <Tab value="plots">
                    <i class="pi pi-chart-line mr-2"></i>Plots
                    <span class="ml-2 badge">{{ localSettings.interactive.uiJson.output.plots.length }}</span>
                  </Tab>
                </TabList>
                <TabPanels>
                  <!-- Inputs -->

                  <TabPanel value="simulationInputs" class="h-full">
                    <div class="h-full flex flex-col">
                      <div class="section-header section-header-interactive">
                        <i class="pi pi-sliders-h text-primary"></i>
                        <div>
                          <h3 class="section-title">Simulation inputs</h3>
                          <p class="section-description">
                            Configure the simulation inputs that a user can modify and that will be available to set the model parameters.
                          </p>
                        </div>
                        <div class="flex-1"></div>
                        <div class="flex-none">
                          <Button
                            icon="pi pi-plus"
                            label="Add simulation input"
                            outlined
                            size="small"
                            @click="addInput"
                          />
                        </div>
                      </div>
                      <ScrollPanel class="min-h-0">
                        <div class="flex flex-col gap-4 mt-2">
                          <!-- Empty state -->

                          <div v-if="!localSettings.interactive.uiJson.input.length" class="empty-state">
                            <i class="pi pi-info-circle empty-state-icon"></i>
                            <p class="text-muted-color mb-2">No simulation inputs are configured.</p>
                          </div>

                          <!-- Simulation input cards -->

                          <div v-for="(input, inputIndex) in localSettings.interactive.uiJson.input" :key="`input_${inputIndex}`">
                            <div class="card-item">
                              <div class="card-header">
                                <div class="flex items-center gap-2">
                                  <span class="item-badge">{{ Number(inputIndex) + 1 }}</span>
                                  <span class="font-medium">{{ input.name }}</span>
                                  <Tag :value="locApi.isDiscreteInput(input) ? 'Discrete' : 'Scalar'" severity="info" size="small" />
                                </div>
                                <Button
                                  icon="pi pi-trash"
                                  severity="danger"
                                  text rounded
                                  size="small"
                                  @click="removeInput(inputIndex)"
                                />
                              </div>
                              <div class="card-body">
                                <!-- Common fields -->

                                <div class="form-row">
                                  <FloatLabel variant="on" class="form-field">
                                    <InputText v-model="input.id" class="w-full" size="small" />
                                    <label>ID</label>
                                  </FloatLabel>
                                  <FloatLabel variant="on" class="form-field">
                                    <InputText v-model="input.name" class="w-full" size="small" />
                                    <label>Name</label>
                                  </FloatLabel>
                                </div>
                                <div class="form-row">
                                  <InputScientificNumber v-model="input.defaultValue" class="form-field"
                                    label="Default value"
                                    size="small"
                                  />
                                  <FloatLabel variant="on" class="form-field">
                                    <InputText v-model="input.visible" class="w-full" size="small" />
                                    <label>Visible (optional)</label>
                                  </FloatLabel>
                                </div>

                                <!-- Type selector -->

                                <div class="form-row">
                                  <FloatLabel variant="on" class="form-field">
                                    <Select
                                      :modelValue="locApi.isDiscreteInput(input) ? 'discrete' : 'scalar'"
                                      @update:modelValue="(val: string) => toggleInputType(inputIndex, val)"
                                      :options="[{label: 'Discrete', value: 'discrete'}, {label: 'Scalar', value: 'scalar'}]"
                                      optionLabel="label"
                                      optionValue="value"
                                      class="w-full"
                                      size="small"
                                    />
                                    <label>Type</label>
                                  </FloatLabel>
                                </div>

                                <!-- Scalar model input fields -->

                                <div v-if="locApi.isScalarInput(input)" class="form-row">
                                  <InputScientificNumber v-model="input.minimumValue" class="form-field"
                                    label="Minimum value"
                                    size="small"
                                  />
                                  <InputScientificNumber v-model="input.maximumValue" class="form-field"
                                    label="Maximum value"
                                    size="small"
                                  />
                                  <InputScientificNumber v-model="input.stepValue" class="form-field"
                                    label="Step value (optional)"
                                    :allowEmpty="true"
                                    size="small"
                                  />
                                </div>

                                <!-- Discrete model input fields -->

                                <div v-if="locApi.isDiscreteInput(input)">
                                  <div class="flex items-center justify-between mb-2">
                                    <label class="text-sm font-medium text-muted-color">Possible values</label>
                                    <Button
                                      icon="pi pi-plus"
                                      label="Add possible value"
                                      outlined
                                      severity="info"
                                      size="small"
                                      @click="addPossibleValue(inputIndex)"
                                    />
                                  </div>
                                  <div v-if="!input.possibleValues.length" class="empty-state empty-state-tight">
                                    <i class="pi pi-info-circle empty-state-icon"></i>
                                    <p class="text-muted-color mb-2">No possible values are configured.</p>
                                  </div>
                                  <div v-else class="possible-values-list">
                                    <div v-for="(possibleValue, possibleValueIndex) in input.possibleValues" :key="`possibleValue${possibleValueIndex}`" class="entry-row">
                                      <span class="index index-secondary">{{ Number(possibleValueIndex) + 1 }}</span>
                                      <FloatLabel variant="on" class="flex-1">
                                        <InputText v-model="possibleValue.name" class="w-full" size="small" />
                                        <label>Name</label>
                                      </FloatLabel>
                                      <InputScientificNumber v-model="possibleValue.value" class="form-field"
                                        label="Value"
                                        size="small"
                                      />
                                      <Button
                                        icon="pi pi-times"
                                        severity="secondary"
                                        text rounded
                                        size="small"
                                        @click="removePossibleValue(inputIndex, possibleValueIndex)"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </ScrollPanel>
                    </div>
                  </TabPanel>

                  <!-- Model parameters -->

                  <TabPanel value="modelParameters" class="h-full">
                    <div class="h-full flex flex-col">
                      <div class="section-header section-header-interactive">
                        <!-- Section description -->

                        <i class="pi pi-list text-primary"></i>
                        <div>
                          <h3 class="section-title">Model parameters</h3>
                          <p class="section-description">
                            Configure the model parameters using the value of the simulation inputs.
                          </p>
                        </div>
                        <div class="flex-1"></div>

                        <!-- Add button -->

                        <div class="flex-none">
                          <Button
                            icon="pi pi-plus"
                            label="Add model parameter"
                            outlined
                            size="small"
                            @click="addParameter"
                          />
                        </div>
                      </div>

                      <!-- Model parameters scroll panel -->

                      <ScrollPanel class="min-h-0">
                        <div class="flex flex-col gap-4 mt-2">
                          <!-- Empty state -->

                          <div v-if="!localSettings.interactive.uiJson.parameters.length" class="empty-state">
                            <i class="pi pi-info-circle empty-state-icon"></i>
                            <p class="text-muted-color mb-2">No model parameters are configured.</p>
                          </div>

                          <!-- Model parameter entries -->

                          <div v-else class="entries-list">
                            <div v-for="(parameter, parameterIndex) in localSettings.interactive.uiJson.parameters" :key="`param_${parameterIndex}`" class="entry-row">
                              <span class="index">{{ Number(parameterIndex) + 1 }}</span>
                              <FloatLabel variant="on" class="flex-1">
                                <Select v-model="parameter.name"
                                  class="w-full" panelClass="model-parameter-filter"
                                  size="small"
                                  editable
                                  filter filterMode="lenient"
                                  :options="editableModelParameters"
                                />
                                <label>Model parameter</label>
                              </FloatLabel>
                              <FloatLabel variant="on" class="flex-1">
                                <InputText v-model="parameter.value" class="w-full" size="small"
                                  v-tippy="{
                                    allowHTML: true,
                                    content: parameterValueTooltip(),
                                    placement: 'bottom-start'
                                  }"
                                />
                                <label>Value</label>
                              </FloatLabel>
                              <Button
                                icon="pi pi-times"
                                text rounded
                                severity="secondary"
                                size="small"
                                @click="removeParameter(parameterIndex)"
                              />
                            </div>
                          </div>
                        </div>
                      </ScrollPanel>
                    </div>
                  </TabPanel>

                  <!-- Simulation data -->

                  <TabPanel value="simulationData" class="h-full">
                    <div class="h-full flex flex-col">
                      <div class="section-header section-header-interactive">
                        <i class="pi pi-database text-primary"></i>
                        <div>
                          <h3 class="section-title">Simulation data</h3>
                          <p class="section-description">
                            Configure the simulation data to be retrieved and that will be available for plotting.
                          </p>
                        </div>
                        <div class="flex-1"></div>
                        <div class="flex-none">
                          <Button
                            icon="pi pi-plus"
                            label="Add simulation data"
                            outlined
                            size="small"
                            @click="addSimulationData"
                          />
                        </div>
                      </div>
                      <ScrollPanel class="min-h-0">
                        <div class="flex flex-col gap-4 mt-2">
                          <!-- Empty state -->

                          <div v-if="!localSettings.interactive.uiJson.output.data.length" class="empty-state">
                            <i class="pi pi-info-circle empty-state-icon"></i>
                            <p class="text-muted-color mb-2">No simulation data is configured.</p>
                          </div>

                          <!-- Simulation data entries -->

                          <div v-else class="entries-list">
                            <div v-for="(data, dataIndex) in localSettings.interactive.uiJson.output.data" :key="`data_${dataIndex}`" class="entry-row">
                              <span class="index">{{ Number(dataIndex) + 1 }}</span>
                              <FloatLabel variant="on" class="flex-1">
                                <InputText v-model="data.id" class="w-full" size="small" />
                                <label>ID</label>
                              </FloatLabel>
                              <FloatLabel variant="on" class="flex-1">
                                <Select v-model="data.name"
                                  class="w-full" panelClass="model-parameter-filter"
                                  size="small"
                                  editable
                                  filter filterMode="lenient"
                                  :options="allModelParameters"
                                />
                                <label>Model parameter</label>
                              </FloatLabel>
                              <Button
                                icon="pi pi-times"
                                text rounded
                                severity="secondary"
                                size="small"
                                @click="removeSimulationData(dataIndex)"
                              />
                            </div>
                          </div>
                        </div>
                      </ScrollPanel>
                    </div>
                  </TabPanel>

                  <!-- Plots -->

                  <TabPanel value="plots" class="h-full">
                    <div class="h-full flex flex-col">
                      <div class="section-header section-header-interactive">
                        <i class="pi pi-chart-line text-primary"></i>
                        <div>
                          <h3 class="section-title">Plots</h3>
                          <p class="section-description">
                            Configure the plots and the corresponding traces using the available simulation data.
                          </p>
                        </div>
                        <div class="flex-1"></div>
                        <div class="flex-none">
                          <Button
                            icon="pi pi-plus"
                            label="Add plot"
                            outlined
                            size="small"
                            @click="addPlot"
                          />
                        </div>
                      </div>
                      <ScrollPanel class="min-h-0">
                        <div class="flex flex-col gap-4 mt-2">
                          <!-- Empty state -->

                          <div v-if="!localSettings.interactive.uiJson.output.plots.length" class="empty-state">
                            <i class="pi pi-info-circle empty-state-icon"></i>
                            <p class="text-muted-color mb-2">No plots are configured.</p>
                          </div>

                          <!-- Plot entries -->

                          <div v-for="(plot, plotIndex) in localSettings.interactive.uiJson.output.plots" :key="`plot_${plotIndex}`" class="plot-item-row">
                            <div class="card-item">
                              <div class="plot-card-header">
                                <div class="flex items-center gap-2">
                                  <span class="item-badge">{{ Number(plotIndex) + 1 }}</span>
                                  <span class="font-medium text-sm">Plot #{{ Number(plotIndex) + 1 }}</span>
                                  <Tag :value="plotTraceCount(plot) + ' trace' + (plotTraceCount(plot) !== 1 ? 's' : '')" severity="info" size="small" />
                                </div>
                                <Button
                                  icon="pi pi-trash"
                                  text rounded
                                  severity="danger"
                                  size="small"
                                  @click="removePlot(plotIndex)"
                                />
                              </div>
                              <div class="plot-card-body">
                                <!-- Axes settings -->

                                <div class="form-row">
                                  <FloatLabel variant="on" class="flex-1">
                                    <InputText v-model="plot.xAxisTitle" class="w-full" size="small" />
                                    <label>X axis title (optional)</label>
                                  </FloatLabel>
                                  <FloatLabel variant="on" class="flex-1">
                                    <InputText v-model="plot.yAxisTitle" class="w-full" size="small" />
                                    <label>Y axis title (optional)</label>
                                  </FloatLabel>
                                </div>

                                <!-- Traces -->

                                <div class="traces-section">
                                  <div class="traces-header">
                                    <span class="text-sm font-medium text-muted-color">Traces</span>
                                    <Button
                                      icon="pi pi-plus"
                                      label="Add trace"
                                      outlined
                                      severity="info"
                                      size="small"
                                      @click="addTrace(plotIndex)"
                                    />
                                  </div>

                                  <div class="traces-list">
                                    <!-- Main trace -->

                                    <Fieldset class="entry-row">
                                      <template #legend="scope">
                                        <span v-html="traceName(plot, -1)" />
                                      </template>
                                      <div class="entry-row entry-row-trace">
                                        <div>
                                          <span class="index index-secondary">1</span>
                                        </div>
                                        <div class="w-full">
                                          <div class="mb-3">
                                            <FloatLabel variant="on" class="flex-1">
                                              <InputText v-model="plot.name" class="w-full" size="small"
                                                v-tippy="{
                                                  allowHTML: true,
                                                  content: traceNameTooltip(),
                                                  placement: 'bottom-start'
                                                }"
                                              />
                                              <label>Name (optional)</label>
                                            </FloatLabel>
                                          </div>
                                          <div class="entry-row">
                                            <FloatLabel variant="on" class="flex-1">
                                              <InputText v-model="plot.xValue" class="w-full" size="small"
                                                v-tippy="{
                                                  allowHTML: true,
                                                  content: xyValueTooltip(true),
                                                  placement: 'bottom-start'
                                                }"
                                              />
                                              <label>X value</label>
                                            </FloatLabel>
                                            <FloatLabel variant="on" class="flex-1">
                                              <InputText v-model="plot.yValue" class="w-full" size="small"
                                                v-tippy="{
                                                  allowHTML: true,
                                                  content: xyValueTooltip(false),
                                                  placement: 'bottom-start'
                                                }"
                                              />
                                              <label>Y value</label>
                                            </FloatLabel>
                                          </div>
                                        </div>
                                        <Button
                                          icon="pi pi-times"
                                          text rounded
                                          severity="secondary"
                                          size="small"
                                          @click="removeTrace(plotIndex, -1)"
                                        />
                                      </div>
                                    </Fieldset>

                                    <!-- Additional traces -->

                                    <div v-for="(trace, traceIndex) in plot.additionalTraces" :key="`trace_${traceIndex}`" class="entry-row">
                                      <Fieldset class="entry-row">
                                        <template #legend="scope">
                                          <span v-html="traceName(plot, traceIndex)" />
                                        </template>
                                        <div class="entry-row entry-row-trace">
                                          <div>
                                            <span class="index index-secondary">{{ Number(traceIndex) + 2 }}</span>
                                          </div>
                                          <div class="w-full">
                                            <div class="mb-3">
                                              <FloatLabel variant="on" class="flex-1">
                                                <InputText v-model="trace.name" class="w-full" size="small"
                                                  v-tippy="{
                                                    allowHTML: true,
                                                    content: traceNameTooltip(),
                                                    placement: 'bottom-start'
                                                  }"
                                                />
                                                <label>Name (optional)</label>
                                              </FloatLabel>
                                            </div>
                                            <div class="entry-row">
                                              <FloatLabel variant="on" class="flex-1">
                                                <InputText v-model="trace.xValue" class="w-full" size="small"
                                                  v-tippy="{
                                                    allowHTML: true,
                                                    content: xyValueTooltip(true),
                                                    placement: 'bottom-start'
                                                  }"
                                                />
                                                <label>X value</label>
                                              </FloatLabel>
                                              <FloatLabel variant="on" class="flex-1">
                                                <InputText v-model="trace.yValue" class="w-full" size="small"
                                                  v-tippy="{
                                                    allowHTML: true,
                                                    content: xyValueTooltip(false),
                                                    placement: 'bottom-start'
                                                  }"
                                                />
                                                <label>Y value</label>
                                              </FloatLabel>
                                            </div>
                                          </div>
                                          <Button
                                            icon="pi pi-times"
                                            text rounded
                                            severity="secondary"
                                            size="small"
                                            @click="removeTrace(plotIndex, traceIndex)"
                                          />
                                        </div>
                                      </Fieldset>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </ScrollPanel>
                    </div>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </div>
          </TabPanel>

          <!-- Miscellaneous -->

          <TabPanel value="miscellaneous" class="h-full">
            <div class="settings-section">
              <div class="section-header">
                <i class="pi pi-bars text-primary"></i>
                <div>
                  <h3 class="section-title">Miscellaneous</h3>
                  <p class="section-description">Configure miscellaneous settings.</p>
                </div>
              </div>
              <div class="settings-form">
                <div class="option-card flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div class="flex items-center gap-2">
                      <i class="pi pi-sync"></i>
                      <span class="font-medium">Live Updates</span>
                    </div>
                    <p class="text-muted-color text-sm mt-1">Automatically re-run the simulation when simulation inputs change.</p>
                  </div>
                  <ToggleSwitch v-model="localSettings.miscellaneous.liveUpdates" />
                </div>
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>

    <!-- Footer -->

    <template #footer>
      <div class="w-full flex flex-col gap-4">

        <!-- Simulation issues -->

        <template v-if="activeTab === 'simulation'">
          <Popover ref="simulationSettingsIssuesPopup" v-if="simulationSettingsIssues.length">
            <div class="issues-popover-content">
              <IssuesView :issues="simulationSettingsIssues" :extraSpace="false" />
            </div>
          </Popover>
          <div :class="simulationSettingsIssues.length ? 'flex-row-reverse' : 'flex-row'" class="actions">
            <span :class="{ 'invisible': simulationSettingsIssues.length }" class="status-valid">
              <i class="pi pi-check-circle"></i>
              <span>Simulation settings are valid!</span>
            </span>
            <Button :class="{ 'invisible': !simulationSettingsIssues.length }" outlined severity="warn" size="small"
              @click="toggleSimulationSettingsIssues"
            >
              <i class="pi pi-exclamation-triangle mr-2"></i>
              <span>{{ simulationSettingsIssues.length }} issue{{ simulationSettingsIssues.length !== 1 ? 's' : '' }}</span>
              <i :class="showSimulationSettingsIssuesPanel ? 'pi pi-arrow-down-left-and-arrow-up-right-to-center ml-2 text-xs!' : 'pi pi-arrow-up-right-and-arrow-down-left-from-center ml-2 text-xs!'"></i>
            </Button>
          </div>
        </template>

        <!-- Solvers issues -->

        <template v-else-if="activeTab === 'solvers'">
          <Popover ref="solversSettingsIssuesPopup" v-if="solversSettingsIssues.length">
            <div class="issues-popover-content">
              <IssuesView :issues="solversSettingsIssues" :extraSpace="false" />
            </div>
          </Popover>
          <div :class="solversSettingsIssues.length ? 'flex-row-reverse' : 'flex-row'" class="actions">
            <span :class="{ 'invisible': solversSettingsIssues.length }" class="status-valid">
              <i class="pi pi-check-circle"></i>
              <span>Solvers settings are valid!</span>
            </span>
            <Button :class="{ 'invisible': !solversSettingsIssues.length }" outlined severity="warn" size="small"
              @click="toggleSolversSettingsIssues"
            >
              <i class="pi pi-exclamation-triangle mr-2"></i>
              <span>{{ solversSettingsIssues.length }} issue{{ solversSettingsIssues.length !== 1 ? 's' : '' }}</span>
              <i :class="showSolversSettingsIssuesPanel ? 'pi pi-arrow-down-left-and-arrow-up-right-to-center ml-2 text-xs!' : 'pi pi-arrow-up-right-and-arrow-down-left-from-center ml-2 text-xs!'"></i>
            </Button>
          </div>
        </template>

        <!-- UI JSON issues -->

        <template v-else-if="activeTab === 'interactive'">
          <Popover ref="uiJsonIssuesPopup" v-if="uiJsonIssues.length">
            <div class="issues-popover-content">
              <IssuesView :issues="uiJsonIssues" :extraSpace="false" />
            </div>
          </Popover>
          <div class="actions">
            <div :class="uiJsonIssues.length ? 'flex-row-reverse' : 'flex-row'" class="actions">
              <span :class="{ 'invisible': uiJsonIssues.length }" class="status-valid">
                <i class="pi pi-check-circle"></i>
                <span>Interactive settings are valid!</span>
              </span>
              <Button :class="{ 'invisible': !uiJsonIssues.length }" outlined severity="warn" size="small"
                @click="toggleUiJsonIssues"
              >
                <i class="pi pi-exclamation-triangle mr-2"></i>
                <span>{{ uiJsonIssues.length }} issue{{ uiJsonIssues.length !== 1 ? 's' : '' }}</span>
                <i :class="showUiJsonIssuesPanel ? 'pi pi-arrow-down-left-and-arrow-up-right-to-center ml-2 text-xs!' : 'pi pi-arrow-up-right-and-arrow-down-left-from-center ml-2 text-xs!'"></i>
              </Button>
            </div>
          </div>
        </template>

        <!-- OK/Cancel -->

        <div class="flex gap-4 justify-end">
          <Button autofocus label="OK" @click="onOk" />
          <Button label="Cancel" severity="secondary" @click="onCancel" />
        </div>
      </div>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import * as locApi from '../../libopencor/locApi.ts';
import * as common from '../../common/common.ts';
import * as locUiJsonApi from '../../libopencor/locUiJsonApi.ts';
import { validateUiJson } from '../../libopencor/locUiJsonApi.ts';
import { EIssueType } from '../../libopencor/locLoggerApi.ts';

export interface ISimulationExperimentViewSettings {
  simulation: {
    startingPoint: number;
    endingPoint: number;
    pointInterval: number;
  };
  solvers: {
    cvodeMaximumStep: number;
  };
  interactive: {
    uiJson: locUiJsonApi.IUiJson;
  };
  miscellaneous: {
    liveUpdates: boolean;
  };
}

const props = defineProps<{
  settings: ISimulationExperimentViewSettings;
  voiId: string;
  voiName: string;
  voiUnit: string;
  allModelParameters: string[];
  editableModelParameters: string[];
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'ok', settings: ISimulationExperimentViewSettings): void;
}>();

const DEFAULT_TAB = 'interactive';
const DEFAULT_INTERACTIVE_TAB = 'simulationInputs';

const simulationSettingsIssuesPopup = vue.ref<{ toggle: (event: Event) => void } | null>(null);
const solversSettingsIssuesPopup = vue.ref<{ toggle: (event: Event) => void } | null>(null);
const uiJsonIssuesPopup = vue.ref<{ toggle: (event: Event) => void } | null>(null);
const activeTab = vue.ref(DEFAULT_TAB);
const activeInteractiveTab = vue.ref(DEFAULT_INTERACTIVE_TAB);
const showSimulationSettingsIssuesPanel = vue.ref(false);
const showSolversSettingsIssuesPanel = vue.ref(false);
const showUiJsonIssuesPanel = vue.ref(false);
const localSettings = vue.ref<ISimulationExperimentViewSettings>(JSON.parse(JSON.stringify(props.settings)));
const numberOfDataPoints = vue.computed(() => {
  // Our total number of data points.
  // Note: only calculate when simulation settings are valid.

  if (simulationSettingsIssues.value.length > 0) {
    return '';
  }

  const { startingPoint, endingPoint, pointInterval } = localSettings.value.simulation;
  const points = Math.ceil((endingPoint - startingPoint) / pointInterval) + 1;
  const res = points.toLocaleString();

  if (!common.isDivisible(endingPoint - startingPoint, pointInterval)) {
    return `~${res}`;
  }

  return res;
});
const simulationSettingsIssues = vue.computed(() => {
  // Validate our simulation settings and return any issues.

  const res: locApi.IIssue[] = [];

  if (localSettings.value.simulation.startingPoint == null) {
    res.push({
      type: EIssueType.WARNING,
      description: 'The starting point must be specified.'
    });
  }

  if (localSettings.value.simulation.endingPoint == null) {
    res.push({
      type: EIssueType.WARNING,
      description: 'The ending point must be specified.'
    });
  }

  if (
    localSettings.value.simulation.startingPoint !== null &&
    localSettings.value.simulation.endingPoint !== null &&
    localSettings.value.simulation.endingPoint <= localSettings.value.simulation.startingPoint
  ) {
    res.push({
      type: EIssueType.WARNING,
      description: 'The ending point must be greater than the starting point.'
    });
  }

  if (localSettings.value.simulation.pointInterval == null) {
    res.push({
      type: EIssueType.WARNING,
      description: 'The point interval must be specified.'
    });
  }

  if (localSettings.value.simulation.pointInterval !== null && localSettings.value.simulation.pointInterval <= 0) {
    res.push({
      type: EIssueType.WARNING,
      description: 'The point interval must be a positive number.'
    });
  }

  return res;
});
const solversSettingsIssues = vue.computed(() => {
  // Validate our solvers settings and return any issues.

  const res: locApi.IIssue[] = [];

  if (localSettings.value.solvers.cvodeMaximumStep === null) {
    res.push({
      type: EIssueType.WARNING,
      description: "CVODE's maximum step must be specified."
    });
  }

  if (localSettings.value.solvers.cvodeMaximumStep !== null && localSettings.value.solvers.cvodeMaximumStep < 0) {
    res.push({
      type: EIssueType.WARNING,
      description: "CVODE's maximum step must be a non-negative number."
    });
  }

  return res;
});
const uiJsonIssues = vue.computed(() => {
  // Validate our local UI JSON and return any issues.

  return validateUiJson(localSettings.value.interactive.uiJson);
});

const plotTraceCount = (plot: locApi.IUiJsonOutputPlot): number => {
  return 1 + (plot.additionalTraces?.length ?? 0);
};

const traceNameTooltip = (): string => {
  return `
    You can provide a name for the trace or leave it empty to have a name generated automatically as follows: <strong>&lt;Y value&gt; <i>vs.</i> &lt;X value&gt;</strong>.<br />
    <br />
    If you provide a name, you can use HTML tags for formatting (e.g., <code>&lt;em&gt;I&lt;sub&gt;Na&lt;/sub&gt;&lt;/em&gt;</code> will render as <em>I<sub>Na</sub></em>).
  `;
};

const xyParameterValueTooltip = (value: string, idType: string, idPrefix: string): string => {
  return `
    You can provide the value of the ${value} using an algebraic expression that includes ${idType} IDs.<br />
    <br />
    For example, to set the ${value} to be the ${idType} with ID <code>${idPrefix}_1</code>, use <code>${idPrefix}_1</code>.<br />
    <br />
    You can also use mathematical functions and operators in the expression (e.g., <code>2 * ${idPrefix}_1 + sin(${idPrefix}_2)</code>).
  `;
};

const xyValueTooltip = (xAxis: boolean): string => {
  return xyParameterValueTooltip(`${xAxis ? 'X' : 'Y'} axis`, 'simulation data', 'simulation_data');
};

const parameterValueTooltip = (): string => {
  return xyParameterValueTooltip('model parameter', 'model input', 'model_input');
};

const traceName = (plot: locApi.IUiJsonOutputPlot, traceIndex: number): string => {
  const actualTraceName = (
    name: string | undefined,
    xValue: string | undefined,
    yValue: string | undefined
  ): string => {
    return name || (xValue && yValue ? `${yValue} <i>vs.</i> ${xValue}` : '???');
  };

  if (traceIndex === -1) {
    return actualTraceName(plot.name, plot.xValue, plot.yValue);
  }

  const additionalTrace = plot.additionalTraces?.[traceIndex];

  return actualTraceName(additionalTrace?.name, additionalTrace?.xValue, additionalTrace?.yValue);
};

const addInput = () => {
  localSettings.value.interactive.uiJson.input.push({
    id: `model_input_${localSettings.value.interactive.uiJson.input.length + 1}`,
    name: `Model input #${localSettings.value.interactive.uiJson.input.length + 1}`,
    defaultValue: 0,
    minimumValue: 0,
    maximumValue: 10
  });
};

const removeInput = (index: number) => {
  localSettings.value.interactive.uiJson.input.splice(index, 1);
};

const toggleInputType = (index: number, type: string) => {
  const input = localSettings.value.interactive.uiJson.input[index];

  if (!input) {
    return;
  }

  const baseInput = {
    name: input.name,
    defaultValue: 0,
    id: input.id,
    visible: input.visible
  };

  if (type === 'discrete') {
    localSettings.value.interactive.uiJson.input[index] = {
      ...baseInput,
      possibleValues: [
        { name: 'Name 1', value: 0 },
        { name: 'Name 2', value: 1 }
      ]
    };
  } else {
    localSettings.value.interactive.uiJson.input[index] = {
      ...baseInput,
      minimumValue: 0,
      maximumValue: 10
    };
  }
};

const addPossibleValue = (inputIndex: number) => {
  const input = localSettings.value.interactive.uiJson.input[inputIndex];

  if (input && locApi.isDiscreteInput(input)) {
    const maxValue = Math.max(...input.possibleValues.map((possibleValue) => possibleValue.value), -1);

    input.possibleValues.push({
      name: `Option ${input.possibleValues.length + 1}`,
      value: maxValue + 1
    });
  }
};

const removePossibleValue = (inputIndex: number, possibleValueIndex: number) => {
  const input = localSettings.value.interactive.uiJson.input[inputIndex];

  if (input && locApi.isDiscreteInput(input)) {
    input.possibleValues.splice(possibleValueIndex, 1);
  }
};

const addSimulationData = () => {
  localSettings.value.interactive.uiJson.output.data.push({
    id: `simulation_data`,
    name: 'component/variable'
  });
};

const removeSimulationData = (index: number) => {
  localSettings.value.interactive.uiJson.output.data.splice(index, 1);
};

const addPlot = () => {
  if (localSettings.value.interactive.uiJson.output.plots.length < 9) {
    localSettings.value.interactive.uiJson.output.plots.push({
      name: '',
      xAxisTitle: '',
      xValue: props.voiId,
      yAxisTitle: '',
      yValue: 'y_id',
      additionalTraces: []
    });
  }
};

const removePlot = (index: number) => {
  localSettings.value.interactive.uiJson.output.plots.splice(index, 1);
};

const addTrace = (plotIndex: number) => {
  const plot = localSettings.value.interactive.uiJson.output.plots[plotIndex];

  if (plot) {
    if (!plot.additionalTraces) {
      plot.additionalTraces = [];
    }

    plot.additionalTraces.push({
      xValue: props.voiId,
      yValue: 'y_id'
    });
  }
};

const removeTrace = (plotIndex: number, traceIndex: number) => {
  const plot = localSettings.value.interactive.uiJson.output.plots[plotIndex];

  if (!plot) {
    return;
  }

  if (traceIndex === -1) {
    // Update the main trace to be the first additional trace and shift it out of the additional traces. If there are no
    // additional traces, just clear the main trace.

    if (plot.additionalTraces && plot.additionalTraces.length > 0) {
      const firstAdditionalTrace = plot.additionalTraces.shift() as locApi.IUiJsonOutputPlot;

      plot.name = firstAdditionalTrace.name || undefined;
      plot.xValue = firstAdditionalTrace.xValue;
      plot.yValue = firstAdditionalTrace.yValue;
    } else {
      plot.name = undefined;
      plot.xValue = props.voiId;
      plot.yValue = 'y_id';
    }

    return;
  }

  if (traceIndex >= 0 && plot.additionalTraces && plot.additionalTraces.length > 0) {
    plot.additionalTraces.splice(traceIndex, 1);
  }
};

const addParameter = () => {
  localSettings.value.interactive.uiJson.parameters.push({
    name: 'component/variable',
    value: 'input_id'
  });
};

const removeParameter = (index: number) => {
  localSettings.value.interactive.uiJson.parameters.splice(index, 1);
};

const resetUxSettings = () => {
  activeTab.value = DEFAULT_TAB;
  activeInteractiveTab.value = DEFAULT_INTERACTIVE_TAB;

  showSimulationSettingsIssuesPanel.value = false;
  showUiJsonIssuesPanel.value = false;
};

const onOk = () => {
  // Reset our UX settings.

  resetUxSettings();

  // Emit our updated settings and close the dialog.

  emit('ok', {
    simulation: {
      startingPoint: localSettings.value.simulation.startingPoint,
      endingPoint: localSettings.value.simulation.endingPoint,
      pointInterval: localSettings.value.simulation.pointInterval
    },
    solvers: {
      cvodeMaximumStep: localSettings.value.solvers.cvodeMaximumStep
    },
    interactive: {
      uiJson: localSettings.value.interactive.uiJson
    },
    miscellaneous: {
      liveUpdates: localSettings.value.miscellaneous.liveUpdates
    }
  });
};

const onCancel = () => {
  // Reset our local settings to the original settings and close the dialog.

  localSettings.value = JSON.parse(JSON.stringify(props.settings));

  // Reset our UX settings.

  resetUxSettings();

  // Close the dialog.

  emit('close');
};

const toggleSimulationSettingsIssues = (event: Event) => {
  simulationSettingsIssuesPopup.value?.toggle(event);

  showSimulationSettingsIssuesPanel.value = !showSimulationSettingsIssuesPanel.value;
};

const toggleSolversSettingsIssues = (event: Event) => {
  solversSettingsIssuesPopup.value?.toggle(event);

  showSolversSettingsIssuesPanel.value = !showSolversSettingsIssuesPanel.value;
};

const toggleUiJsonIssues = (event: Event) => {
  uiJsonIssuesPopup.value?.toggle(event);

  showUiJsonIssuesPanel.value = !showUiJsonIssuesPanel.value;
};
</script>

<style scoped>
.actions {
  display: flex;
  justify-content: space-between;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  font-size: 0.75rem;
  font-weight: bold;
  background-color: var(--p-button-primary-background);
  color: var(--p-primary-contrast-color);
  border-radius: 9999px;
}

.card-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-content-border-color);
}

.card-item {
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.5rem;
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.empty-state-icon {
  font-size: 1.5rem;
  color: var(--p-text-muted-color);
  margin-bottom: 0.75rem;
}

.empty-state-tight {
  padding: 0;
}

.entries-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.entry-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.entry-row :deep(.p-fieldset-content-container),
.entry-row :deep(.p-fieldset-content) {
  width: 100%;
}

.entry-row-trace {
  align-items: stretch;
}

.form-field {
  flex: 1;
  display: flex !important;
}

.form-row {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.75rem;
  font-weight: bold;
  background-color: var(--p-button-primary-background);
  color: var(--p-primary-contrast-color);
  border-radius: 0.25rem;
}

.index-secondary {
  background-color: var(--p-button-info-background);
  border-radius: 9999px;
}

.item-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.75rem;
  font-weight: bold;
  background-color: var(--p-button-primary-background);
  color: var(--p-primary-contrast-color);
  border-radius: 0.375rem;
}

.option-card {
  border-color: var(--p-content-border-color);
}

.outputs-section {
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.5rem;
  padding: 1rem;
}

.outputs-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

:global(.p-popover .issues-popover-content) {
  max-height: 30rem;
  max-width: 35rem;
  overflow-y: auto;
}

:global(.p-select-overlay.model-parameter-filter .p-select-header > div > input) {
  padding: 0.25rem;
  padding-right: 0;
}

:deep(.p-tabpanels) {
  padding: 0;
}

.plot-card {
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.375rem;
  overflow: hidden;
}

.plot-card-body {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.plot-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--p-content-border-color);
}

.possible-values-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-description {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.section-header > i {
  font-size: 1.5rem;
  margin-top: 0.125rem;
}

.section-header-interactive {
  margin: 0.5rem 0 0.5rem 0;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: bold;
  color: var(--p-text-color);
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-section {
  padding-top: 0.5rem;
}

.settings-tabs :deep(.p-tab) {
  padding: 0.75rem 1rem;
  font-weight: bold;
}

.settings-tabs :deep(.p-tablist) {
  border-bottom: 1px solid var(--p-content-border-color);
}

.settings-tabs :deep(.p-tabpanels) {
  overflow: hidden;
}

.status-valid {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--p-message-success-color);
  font-size: 0.875rem;
}

.status-valid i {
  font-size: 1rem;
}

.text-muted-color {
  color: var(--p-text-muted-color);
}

.text-primary {
  color: var(--p-primary-color);
}

.traces-badge {
  font-size: 0.625rem;
  font-weight: bold;
  padding: 0.125rem 0.375rem;
  color: var(--p-text-muted-color);
  border-radius: 0.25rem;
}

.traces-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.traces-list {
  display: flex;
  flex-direction: column;
}

.traces-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.validation-status {
  display: flex;
  align-items: center;
}
</style>
