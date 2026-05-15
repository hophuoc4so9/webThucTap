const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Cấu hình kết nối DB (Lấy từ .env nếu cần, ở đây hardcode theo context thông thường)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: 5433, // Port 5433 maps to postgres-job in docker-compose
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Phuoc123456',
  database: process.env.DB_NAME_JOB || 'jobdb',
};

async function syncDatabase() {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log('🚀 Đã kết nối cơ sở dữ liệu Jobs (Port 5433).');

    // 1. Đọc dữ liệu mới từ donvitdmu_new.json
    const newDataPath = path.join(__dirname, '../donvitdmu_new.json');
    const newData = JSON.parse(fs.readFileSync(newDataPath, 'utf-8'));

    // Tạo bản đồ ánh xạ Ngành -> Khoa/Viện mới
    const majorToGroupMap = {};
    newData.don_vi_dao_tao.forEach(group => {
      group.nganh.forEach(major => {
        majorToGroupMap[major.trim().toUpperCase()] = group.ten;
      });
    });

    console.log('📖 Đã tải bản đồ ngành mới.');

    // 2. Cập nhật bảng jobs (Cột nganh_hoc và nhom)
    console.log('🔄 Đang cập nhật bảng jobs...');
    const jobsRes = await client.query('SELECT id, nganh_hoc, nhom FROM jobs');
    let jobUpdates = 0;

    for (const row of jobsRes.rows) {
      if (!row.nganh_hoc || !Array.isArray(row.nganh_hoc)) continue;

      const newGroups = new Set();
      row.nganh_hoc.forEach(major => {
        const group = majorToGroupMap[major.trim().toUpperCase()];
        if (group) newGroups.add(group);
      });

      if (newGroups.size > 0) {
        const groupsArray = Array.from(newGroups);
        await client.query('UPDATE jobs SET nhom = $1 WHERE id = $2', [groupsArray, row.id]);
        jobUpdates++;
      }
    }
    console.log(`   ✓ Đã cập nhật ${jobUpdates} bản ghi trong bảng jobs.`);

    // 3. Cập nhật bảng cvs (Cột major và major_group)
    const cvDbConfig = { 
      ...dbConfig, 
      port: 5434, // Port 5434 maps to postgres-cv in docker-compose
      database: 'cvdb' 
    };
    const cvClient = new Client(cvDbConfig);
    try {
      await cvClient.connect();
      console.log('🚀 Đã kết nối cơ sở dữ liệu CV.');
      
      const cvsRes = await cvClient.query('SELECT id, major, major_group FROM cvs');
      let cvUpdates = 0;

      for (const row of cvsRes.rows) {
        if (!row.major) continue;
        const newGroup = majorToGroupMap[row.major.trim().toUpperCase()];
        if (newGroup && newGroup !== row.major_group) {
          await cvClient.query('UPDATE cvs SET major_group = $1 WHERE id = $2', [newGroup, row.id]);
          cvUpdates++;
        }
      }
      console.log(`   ✓ Đã cập nhật ${cvUpdates} bản ghi trong bảng cvs.`);
      await cvClient.end();
    } catch (e) {
      console.log('   ℹ️  Bỏ qua bảng cvs (không tìm thấy db hoặc bảng).');
    }

    console.log('\n✨ Hoàn tất đồng bộ Database!');
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  } finally {
    await client.end();
  }
}

syncDatabase();
