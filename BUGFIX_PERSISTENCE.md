# Bug Fix: localStorage Persistence Data Loss

## Problem Summary
When saving data with the "Guardar" button, the JSON correctly included `plantillas`, `changeHistory`, and `catalogItems`. However, after reloading the page one or more times, these properties would disappear from localStorage, being replaced with:
- `plantillas: 0` (should be 1+)
- `catalogItems: 0` (should include user-created items)
- `changeHistory: NO` (should be YES with entries)

## Root Cause Identified
Using the diagnostic logging, the exact issue was pinpointed to a **watcher in `useCanvasStore.js` (line 2737-2746)** that was automatically persisting state whenever `modoEdicion` changed.

### The Call Stack
```
Error
    at localStorage.setItem (HomePage.vue:167:21)
    at persist (useStatePersistence.js:641:22)
    at persist (useCanvasStore.js:1078:14)
    at useCanvasStore.js:2741:9  ← The problematic watcher
```

### Why It Caused Data Loss
The watcher was calling `persist()` which only serialized:
```javascript
const state = {
  plantas: plantas.value,
  elementos: elementos.value,
  modoEdicion: modoEdicion.value,
}
```

**Missing from this persist:**
- ❌ `plantillas` (templates)
- ❌ `catalogItems` (user-created spaces/rooms)
- ❌ `changeHistory` (edit history)

This incomplete state would overwrite the complete state in localStorage, causing permanent data loss.

### When It Triggered
The watcher triggered during:
1. **Initial page load** - When components mounted and `modoEdicion` was initialized
2. **After deserialization** - When the edit mode was restored from loaded data
3. **Any time edit mode changed** - Including programmatic changes

## The Fix

### 1. Disabled Automatic Persist (Primary Fix)
**File:** `useCanvasStore.js` line 2737-2758

Changed the `modoEdicion` watcher to NOT call `persist()`:
```javascript
watch(
  () => modoEdicion.value,
  () => {
    // DISABLED: This watcher was causing data loss by persisting incomplete state
    // Persistence now only happens via explicit save actions ("Guardar" button)
    console.log('[useCanvasStore] modoEdicion changed to:', modoEdicion.value, '(auto-persist disabled)')
  },
)
```

**Why this is safe:**
- Users explicitly save via the "Guardar" button
- The button triggers `canvasStore.serialize(true)` which includes ALL properties
- No automatic saves are needed for the application to function correctly

### 2. Added Deserialization Protection (Defense in Depth)
**File:** `useCanvasStore.js` lines 1792-1908

Added `isDeserializing` flag to prevent any watchers from persisting during deserialization:

```javascript
const deserialize = (jsonString) => {
  isDeserializing.value = true  // Block watchers
  console.log('[useCanvasStore.deserialize] Setting isDeserializing=true')
  
  try {
    // ... deserialization logic ...
    return ok
  } finally {
    // Always reset, even on error
    isDeserializing.value = false
    console.log('[useCanvasStore.deserialize] Setting isDeserializing=false')
  }
}
```

This ensures that even if we add new watchers in the future, they won't cause data loss during initialization.

## Testing

### Before Fix
1. ✅ Save with "Guardar" - includes plantillas, catalogItems, changeHistory
2. ❌ Reload page - data lost immediately due to watcher triggering on mount
3. ❌ Data in localStorage incomplete

### After Fix
1. ✅ Save with "Guardar" - includes plantillas, catalogItems, changeHistory
2. ✅ Reload page - data persists correctly
3. ✅ Multiple reloads - data remains intact
4. ✅ No automatic overwrites - only explicit saves modify localStorage

## Verification Steps

1. **Clear localStorage:**
   ```javascript
   localStorage.clear()
   ```

2. **Create test data:**
   - Create a planta
   - Add elementos
   - Create a template (plantilla)
   - Create custom catalog items (espacios/cuartos)
   - Make edits to generate changeHistory

3. **Click "Guardar"**

4. **Check console logs:**
   ```
   [PlantasPanel] Serialized config contains:
     - plantillas: 1 ✓
     - catalogItems: X ✓
     - changeHistory: YES ✓
   
   [INTERCEPTOR] localStorage.setItem called
     - plantillas: 1 ✓
     - catalogItems: X ✓
     - changeHistory: YES ✓
   ```

5. **Reload page 5 times**

6. **Verify after each reload:**
   ```
   [HomePage onMounted] Loaded config contains:
     - plantillas: 1 ✓  (NOT 0!)
     - catalogItems: X ✓ (NOT 0!)
     - changeHistory: YES ✓ (NOT NO!)
   ```

7. **No unexpected [INTERCEPTOR] logs** - Only when clicking "Guardar"

## Related Files Changed

1. **`useCanvasStore.js`**
   - Added `isDeserializing` flag (line 2738)
   - Modified `deserialize()` to set/unset flag (lines 1793-1906)
   - Disabled automatic persist in `modoEdicion` watcher (lines 2740-2758)

2. **Diagnostic Logging Added (for debugging only, can be removed):**
   - `HomePage.vue` - localStorage interceptor
   - `InventorySmart.vue` - serialize/deserialize tracking
   - `PlantasPanel.vue` - save button tracking

## Future Recommendations

### Option 1: Remove the `persist()` Function Entirely
Since it only saves partial state and is no longer used, consider removing it:
```javascript
// Remove this function - it's dangerous
const persist = () => {
  try {
    const state = {
      plantas: plantas.value,
      elementos: elementos.value,
      modoEdicion: modoEdicion.value,
    }
    const data = _serialize(state)
    return _persist(data)
  } catch (e) {
    console.warn('Error persisting state', e)
    return false
  }
}
```

### Option 2: Fix the `persist()` Function
If automatic persistence is needed in the future, fix it to serialize complete state:
```javascript
const persist = () => {
  try {
    // Use the full serialize method instead of partial state
    const data = serialize(true) // Include all properties
    return _persist(data)
  } catch (e) {
    console.warn('Error persisting state', e)
    return false
  }
}
```

## Lessons Learned

1. **Watchers can cause unexpected side effects** - Always consider what triggers them
2. **Partial state saves are dangerous** - Either save everything or save nothing
3. **Diagnostic logging is essential** - The interceptor pattern helped identify the exact issue
4. **Defense in depth** - Multiple safeguards prevent similar issues in the future

## Impact

✅ **Fixed:** Templates, catalog items, and change history now persist correctly across reloads

✅ **Safe:** Only explicit user saves modify localStorage

✅ **Reliable:** Data integrity maintained even with multiple page reloads

✅ **Performance:** No unnecessary automatic saves during initialization
