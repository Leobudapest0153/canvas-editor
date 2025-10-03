# Diagnostic Guide - localStorage Persistence Issue

## Problem
When saving data, the JSON includes `plantillas`, `changeHistory`, and `catalogItems`, but after reloading the page several times, these properties disappear from localStorage.

## Root Cause Hypothesis
Something is overwriting the localStorage with incomplete data after the initial save, rather than the serialization/deserialization itself being broken.

## Diagnostic Logging Added

### 1. Global localStorage Interceptor (HomePage.vue)
**Location:** `onMounted` in HomePage.vue

**What it does:**
- Intercepts EVERY call to `localStorage.setItem` for the `canvas_data` key
- Shows what's being saved
- Shows the full call stack to identify WHERE the save originated

**What to look for:**
```
========== [INTERCEPTOR] localStorage.setItem called ==========
[INTERCEPTOR] Key: canvas_data
[INTERCEPTOR] Value length: 12345
[INTERCEPTOR] Value contains:
  - plantas: 2
  - elementos: 5
  - plantillas: 0  ← PROBLEM: Should not be 0 if you created templates
  - catalogItems: 3  ← PROBLEM: Might be missing user-created items
  - changeHistory: NO  ← PROBLEM: Should be YES if you saved changes
[INTERCEPTOR] Call stack:
  at ...  ← This shows WHERE the problematic save originated
```

### 2. Serialization Logging (PlantasPanel.vue)
**Location:** `guardarCambios` function

**What it does:**
- Logs what's being serialized when you click the "Guardar" button
- Shows the exact content before emitting to parent

**What to look for:**
- Does the serialized data include all properties when you first save?
- Compare this with what the interceptor shows being saved to localStorage

### 3. Config Changed/Updated Logging (InventorySmart.vue)
**Location:** 
- `handleConfigChanged` - receives config from child components
- `saveAndExit` - saves before exiting

**What it does:**
- Tracks config flowing from child → parent → localStorage
- Shows the content at each step

**What to look for:**
- Is data being lost between these steps?
- Does one of these handlers receive incomplete data?

### 4. Initial Load Logging (HomePage.vue)
**Location:** `onMounted`

**What it does:**
- Shows what data is loaded from localStorage on page mount

**What to look for:**
- Compare what's loaded initially vs. what was saved
- Check if the problem exists immediately after reload or develops over time

## How to Use These Logs

### Step 1: Start Fresh
1. Clear localStorage: `localStorage.clear()` in browser console
2. Reload the page
3. Create some test data:
   - Create a planta
   - Add some elementos
   - Create a template (plantilla)
   - Create a custom catalog item (espacio/cuarto)
   - Make several edits to generate change history

### Step 2: First Save
1. Click "Guardar" button
2. Check the console logs:
   - `[PlantasPanel] guardarCambios` - What was serialized?
   - `[InventorySmart] handleConfigChanged` - What was received?
   - `[HomePage] handleConfigUpdated` - What was received by parent?
   - `[INTERCEPTOR]` - What was actually saved to localStorage?

**Expected:** All should show plantillas, catalogItems, and changeHistory

### Step 3: Reload Page
1. Reload the page (F5)
2. Check the console logs:
   - `[HomePage onMounted]` - What was loaded from localStorage?

**Expected:** Should match what was saved in Step 2

### Step 4: Make Another Change
1. Make a small change (move an element, etc.)
2. Wait a few seconds
3. Check if any `[INTERCEPTOR]` logs appear automatically

**Critical Question:** Is something auto-saving without you clicking "Guardar"?

### Step 5: Save Again
1. Click "Guardar" again
2. Check the console logs again (same as Step 2)

**Expected:** Should STILL include all properties

### Step 6: Multiple Reloads
1. Reload the page 3-5 times in a row
2. After each reload, check `[HomePage onMounted]` logs
3. Look for when the data becomes incomplete

**Critical Question:** Does it lose data on the first reload or after multiple reloads?

## Common Culprits to Look For

### 1. Auto-save Process
**What to check:**
- Look for `[INTERCEPTOR]` logs that appear WITHOUT you clicking "Guardar"
- Check the call stack to see if it's coming from `useAutoSave.js`

**Fix:** Disable auto-save or ensure it serializes correctly

### 2. Race Condition During Deserialization
**What to check:**
- Look at the timestamps of logs during page load
- Check if `setPredefinedElements` is called before deserialization completes

**Fix:** Already implemented with `isDeserializing` flag, but verify it's working

### 3. Partial State Updates
**What to check:**
- Look for saves that happen during component initialization
- Check if any watchers are triggering saves with incomplete state

**Fix:** Add guards to prevent saves during initialization

### 4. Event Handler Issues
**What to check:**
- Compare the content logged in `handleConfigChanged` vs. `handleConfigUpdated`
- See if data is being lost during event propagation

**Fix:** Ensure events pass full serialized data

## Next Steps Based on Findings

### If data is complete on first save but lost on reload:
→ Problem is in deserialization or loading logic

### If data is incomplete on first save:
→ Problem is in serialization logic (store.serialize)

### If data is complete on first reload but lost after multiple reloads:
→ Problem is a watcher or auto-save process overwriting with partial data

### If INTERCEPTOR shows different data than what was serialized:
→ Problem is in the event chain between serialize and localStorage

## Share These Findings

When you run these tests, share:
1. The complete console output (or screenshot)
2. Which step the problem occurs at
3. What the call stack shows in the [INTERCEPTOR] logs for the problematic save

This will pinpoint exactly where the data loss is happening!
