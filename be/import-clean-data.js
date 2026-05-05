const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:8082';

const importData = async () => {
  try {
    console.log('🚀 Bắt đầu quá trình import dữ liệu sạch...');

    // 1. Xoá dữ liệu cũ
    console.log('🗑️  Đang xoá dữ liệu cũ (jobs & companies)...');
    const clearRes = await fetch(`${API_BASE}/jobs/clear-all`, {
      method: 'DELETE',
    });
    const clearResult = await clearRes.json();
    if (clearRes.ok) {
      console.log('   ✓ ' + clearResult.message);
    } else {
      console.error('   ✗ Thất bại khi xoá dữ liệu:', clearResult);
      return;
    }

    // 2. Đọc file JSON mới
    const filePath = path.join(__dirname, '../data-crawl/data_jobs_final_clean.json');
    console.log(`📖 Đang đọc file: ${filePath}`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`   ✓ Đã đọc ${data.length} bản ghi.`);

    // 3. Chuẩn bị dữ liệu để seed
    const jobs = data.map((item, index) => ({
      title: item.title,
      company: item.company,
      description: item.description,
      requirement: item.requirement,
      location: item.location,
      salaryMin: item.salary ? String(item.salary.min) : '0',
      salaryMax: item.salary ? String(item.salary.max) : '0',
      salary: item.salary ? `${item.salary.min} - ${item.salary.max}` : 'Thỏa thuận',
      tagsRequirement: Array.isArray(item.tags_requirement) ? item.tags_requirement.join(', ') : '',
      nhom: item.nhom || [],
      nganh_hoc: item.nganh_hoc || [],
      postedAt: '2026-07-05',
      deadlineAt: '2026-08-31',
      startDate: '2026-07-05',
      src: 'clean-dataset',
      crawlId: `clean-${index}-${Date.now()}`, // Tạo ID duy nhất cho dataset mới
    }));

    // 4. Seed theo batch
    const batchSize = 50;
    let totalInserted = 0, totalSkipped = 0, totalIndexed = 0;

    console.log(`\n📤 Bắt đầu seed ${jobs.length} jobs (batch size: ${batchSize})...`);

    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      process.stdout.write(`   Gửi batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(jobs.length / batchSize)}... `);

      try {
        const response = await fetch(`${API_BASE}/jobs/seed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobs: batch }),
        });

        const result = await response.json();
        if (response.ok) {
          totalInserted += result.inserted || 0;
          totalSkipped += result.skipped || 0;
          totalIndexed += result.indexed || 0;
          console.log(`DONE (Inserted: ${result.inserted}, Skipped: ${result.skipped})`);
        } else {
          console.log(`FAILED!`, result);
        }
      } catch (err) {
        console.log(`ERROR: ${err.message}`);
      }
    }

    console.log('\n📊 Hoàn tất import!');
    console.log(`   Tổng số đã chèn: ${totalInserted}`);
    console.log(`   Tổng số bỏ qua: ${totalSkipped}`);
    console.log(`   Tổng số đã index (AI): ${totalIndexed}`);

  } catch (error) {
    console.error('❌ Lỗi nghiêm trọng:', error.message);
  }
};

importData();
