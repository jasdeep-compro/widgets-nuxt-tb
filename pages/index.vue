<template>
  <div class="home-layout">
    <header class="home-header">
      <h1>k12w Item Player — Starter App</h1>
      <p>Choose a demo below to try a Lit-based item player.</p>
    </header>

    <ul class="home-cards">
      <li>
        <NuxtLink to="/mcq-demo" class="home-card">
          <span class="home-card-tag">@comprodls/w-multi-mcqsr</span>
          <h2>MCQ Activity Demo</h2>
          <p>Close-ended activity shell hosting a multi-MCQSR item. Controls via the Activity interface.</p>
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/fib-demo" class="home-card">
          <span class="home-card-tag">@comprodls/w-fib</span>
          <h2>FIB Activity Demo</h2>
          <p>Close-ended activity shell hosting a fill-in-the-blanks item. Controls via the Activity interface.</p>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.home-layout {
  font-family: system-ui, sans-serif;
  max-width: 800px;
  margin: 4rem auto;
  padding: 0 1rem;
}
.home-header h1 { margin-bottom: 0.25rem; }
.home-header p  { color: #666; margin-top: 0; }

.home-cards {
  list-style: none;
  padding: 0;
  margin: 2rem 0 0;
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.home-card {
  display: block;
  padding: 1.25rem 1.5rem;
  border: 1px solid #ddd;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  width: 280px;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.home-card:hover {
  border-color: #999;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.home-card-tag {
  font-size: 0.7rem;
  font-family: monospace;
  color: #777;
  background: #f3f3f3;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.home-card h2 {
  margin: 0.75rem 0 0.4rem;
  font-size: 1.1rem;
}

.home-card p {
  margin: 0;
  font-size: 0.875rem;
  color: #555;
  line-height: 1.5;
}
</style>
