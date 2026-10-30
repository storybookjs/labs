<script lang="ts">
  import { login } from './probes.remote.ts';
</script>

<form {...login} aria-label="Login">
  <label>
    Name
    <input {...login.fields.name.as('text')} />
  </label>
  <button>Sign in</button>
  {#if login.result}
    <p role="status">signed in as {login.result.name}, was {login.result.before ?? 'nobody'}</p>
  {/if}
</form>
