const fs = require('fs');
const path = require('path');

const approveCompanies = async () => {
  try {
    console.log('Fetching all pending companies...');

    // Get all companies (including pending ones)
    const response = await fetch('http://localhost:8082/companies/admin?page=1&limit=1000&status=pending');
    const result = await response.json();

    console.log(`Found ${result.total} pending companies`);

    if (!result.data || result.data.length === 0) {
      console.log('No pending companies to approve');
      return;
    }

    let approved = 0;
    for (const company of result.data) {
      try {
        const approveResponse = await fetch(
          `http://localhost:8082/companies/${company.id}/approve`,
          { method: 'PUT', headers: { 'Content-Type': 'application/json' } }
        );

        if (approveResponse.ok) {
          approved++;
          console.log(`✓ Approved company: ${company.name}`);
        } else {
          console.error(`✗ Failed to approve company ${company.id}:`, await approveResponse.json());
        }
      } catch (error) {
        console.error(`✗ Error approving company ${company.id}:`, error.message);
      }
    }

    console.log(`\n✅ Approved ${approved}/${result.total} companies`);
  } catch (error) {
    console.error('Error:', error.message);
  }
};

approveCompanies();
