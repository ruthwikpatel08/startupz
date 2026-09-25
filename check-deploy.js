async function checkDeployment() {
  try {
    const html = await (await fetch('https://startupz-opal.vercel.app/')).text();
    const match = html.match(/index-[a-zA-Z0-9_-]+\.js/);
    if (match) {
      console.log('Vercel Bundle:', match[0]);
      const js = await (await fetch('https://startupz-opal.vercel.app/assets/' + match[0])).text();
      console.log('Vercel bundle includes Render URL:', js.includes('startupz-90c7.onrender.com'));
    }

    const renderHealth = await (await fetch('https://startupz-90c7.onrender.com/api/health')).json();
    console.log('Render Health:', renderHealth);

    const renderDb = await fetch('https://startupz-90c7.onrender.com/api/health/db');
    console.log('Render DB Status:', renderDb.status);
    const dbData = await renderDb.json().catch(() => ({}));
    console.log('Render DB Data:', dbData);
  } catch (err) {
    console.error('Check failed:', err.message);
  }
}

checkDeployment();
