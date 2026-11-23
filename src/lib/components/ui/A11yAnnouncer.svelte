<script lang="ts">
	import { battleAnnouncer } from '$lib/services/battleAnnouncer.svelte';
</script>

<!-- Screen-reader accessible live regions for real-time RTS announcements -->
<div class="sr-only">
	<div
		role="status"
		aria-live="polite"
		aria-atomic="true"
		data-testid="a11y-announcer-polite"
	>
		{battleAnnouncer.polite}
	</div>
	<div
		role="alert"
		aria-live="assertive"
		aria-atomic="true"
		data-testid="a11y-announcer-assertive"
	>
		{battleAnnouncer.assertive}
	</div>
</div>
