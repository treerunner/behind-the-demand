<script lang="ts">
  import type { PageData } from './$types'
  export let data: PageData
</script>

<main>
  <h1>Behind the Demand</h1>
  <p>Tracking data centers in the Chesapeake watershed.</p>
  <p>{data.facilityCount} facilities tracked</p>
</main>
