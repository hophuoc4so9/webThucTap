const fs = require('fs');
const path = require('path');

const seedData = async () => {
  try {
    const filePath = path.join(__dirname, '../data-crawl/data_jobs.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const jobs = data.map(item => ({
      title: item.title,
      company: item.company,
      description: item.description,
      requirement: item.requirement,
      benefit: item.benefit,
      salary: item.salary,
      salaryMin: item.salary_min,
      salaryMax: item.salary_max,
      location: item.location,
      industry: item.industry,
      degree: item.degree,
      experience: item.experience,
      age: item.age,
      deadline: item.deadline,
      deadlineAt: item.deadlineAt,
      postedAt: item.postedAt,
      url: item.url,
      src: item.src || 'crawl',
      crawlId: `${item.src}-${item.url}`,
    }));

    const batchSize = 20;
    let totalInserted = 0, totalSkipped = 0, totalIndexed = 0;

    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      console.log(`Seeding batch ${Math.floor(i / batchSize) + 1} (${batch.length} jobs)...`);

      const response = await fetch('http://localhost:8082/jobs/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs: batch }),
      });

      const result = await response.json();
      if (response.ok) {
        totalInserted += result.inserted || 0;
        totalSkipped += result.skipped || 0;
        totalIndexed += result.indexed || 0;
        console.log(`  ✓ Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
      } else {
        console.error(`  ✗ Batch failed:`, result);
      }
    }

    console.log('\n📊 Seed completed!');
    console.log(`   Total inserted: ${totalInserted}`);
    console.log(`   Total skipped: ${totalSkipped}`);
    console.log(`   Total indexed: ${totalIndexed}`);
  } catch (error) {
    console.error('Seed error:', error.message);
  }
};

seedData();
