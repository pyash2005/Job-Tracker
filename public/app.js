// ==========================================================================
// GLOBAL STATE
// ==========================================================================
let jobsState = []; // Holds the master list of all jobs from database
let activeFilter = 'All'; // Track current status filter
let deleteTargetId = null; // Track ID of the job queue for deletion

// API base URL
const API_URL = '/api';

// ==========================================================================
// DOM ELEMENTS
// ==========================================================================
const addForm = document.getElementById('add-job-form');
const editForm = document.getElementById('edit-job-form');
const jobsTbody = document.getElementById('jobs-tbody');
const emptyState = document.getElementById('empty-state');
const totalBadge = document.getElementById('total-badge');

// Stats Counters
const statTotalEl = document.getElementById('stat-total');
const statInterviewEl = document.getElementById('stat-interview');
const statOfferEl = document.getElementById('stat-offer');
const statRejectedEl = document.getElementById('stat-rejected');

// Modals
const editModal = document.getElementById('edit-modal');
const deleteDialog = document.getElementById('delete-dialog');

// Modal Control Buttons
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

// Filter Buttons
const filterButtons = document.querySelectorAll('.filter-btn');

// Submit Buttons
const submitBtn = document.getElementById('submit-btn');
const saveBtn = document.getElementById('save-btn');

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Set default date to today's date in local timezone
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const formattedToday = `${yyyy}-${mm}-${dd}`;
  document.getElementById('apply_date').value = formattedToday;

  // Initial fetch of jobs
  fetchJobs();

  // Setup Event Listeners
  setupEventListeners();
});

// ==========================================================================
// EVENT LISTENERS SETUP
// ==========================================================================
function setupEventListeners() {
  // Add Job Form Submit
  addForm.addEventListener('submit', handleAddJob);

  // Edit Job Form Submit
  editForm.addEventListener('submit', handleUpdateJob);

  // Close Edit Modal clicks
  closeModalBtn.addEventListener('click', hideEditModal);
  cancelEditBtn.addEventListener('click', hideEditModal);

  // Close Delete Confirmation Dialog clicks
  cancelDeleteBtn.addEventListener('click', hideDeleteDialog);
  confirmDeleteBtn.addEventListener('click', handleDeleteJob);

  // Close modals when clicking outside the card content
  window.addEventListener('click', (e) => {
    if (e.target === editModal) hideEditModal();
    if (e.target === deleteDialog) hideDeleteDialog();
  });

  // Filter Buttons selection
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active class on filter buttons
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update active filter and render
      activeFilter = btn.getAttribute('data-filter');
      renderJobs();
    });
  });
}

// ==========================================================================
// API CLIENT CALLS
// ==========================================================================

/**
 * Fetch all job applications from backend.
 */
async function fetchJobs() {
  try {
    const response = await fetch(`${API_URL}/jobs`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    jobsState = await response.json();
    renderJobs();
  } catch (error) {
    console.error('Error fetching jobs:', error);
    showToast('Failed to load applications. Please check server connection.', 'error');
  }
}

/**
 * Handle new job form submission.
 */
async function handleAddJob(e) {
  e.preventDefault();

  const formData = new FormData(addForm);
  const jobData = {
    company: formData.get('company'),
    role: formData.get('role'),
    apply_date: formData.get('apply_date'),
    status: formData.get('status'),
    job_link: formData.get('job_link'),
    notes: formData.get('notes')
  };

  // Basic client-side validation
  if (!jobData.company.trim() || !jobData.role.trim() || !jobData.apply_date) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  // Show loading spinner
  toggleLoadingSpinner(submitBtn, true);

  try {
    const response = await fetch(`${API_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jobData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to add application');
    }

    // Success actions
    showToast(`${jobData.company} application added successfully!`, 'success');
    addForm.reset();
    
    // Set date input back to today after reset
    const resetToday = new Date();
    const ry = resetToday.getFullYear();
    const rm = String(resetToday.getMonth() + 1).padStart(2, '0');
    const rd = String(resetToday.getDate()).padStart(2, '0');
    const formattedResetToday = `${ry}-${rm}-${rd}`;
    document.getElementById('apply_date').value = formattedResetToday;

    // Refresh state
    jobsState.unshift(result); // Add to the beginning of local array
    renderJobs();

  } catch (error) {
    console.error('Error adding job:', error);
    showToast(error.message || 'Error occurred while creating application.', 'error');
  } finally {
    // Hide loading spinner
    toggleLoadingSpinner(submitBtn, false);
  }
}

/**
 * Handle update job form submission.
 */
async function handleUpdateJob(e) {
  e.preventDefault();

  const formData = new FormData(editForm);
  const jobId = formData.get('id');
  const jobData = {
    company: formData.get('company'),
    role: formData.get('role'),
    apply_date: formData.get('apply_date'),
    status: formData.get('status'),
    job_link: formData.get('job_link'),
    notes: formData.get('notes')
  };

  // Basic validation
  if (!jobData.company.trim() || !jobData.role.trim() || !jobData.apply_date) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  // Show loading spinner
  toggleLoadingSpinner(saveBtn, true);

  try {
    const response = await fetch(`${API_URL}/jobs/${jobId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jobData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update application');
    }

    // Success actions
    showToast('Application updated successfully!', 'success');
    hideEditModal();

    // Update locally in array
    const index = jobsState.findIndex(j => j.id == jobId);
    if (index !== -1) {
      jobsState[index] = result;
    }
    
    renderJobs();

  } catch (error) {
    console.error('Error updating job:', error);
    showToast(error.message || 'Error occurred while saving application details.', 'error');
  } finally {
    toggleLoadingSpinner(saveBtn, false);
  }
}

/**
 * Handle deleting job after confirmation.
 */
async function handleDeleteJob() {
  if (!deleteTargetId) return;

  try {
    const response = await fetch(`${API_URL}/jobs/${deleteTargetId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete application');
    }

    showToast('Application deleted successfully.', 'success');
    hideDeleteDialog();

    // Update state locally
    jobsState = jobsState.filter(j => j.id !== deleteTargetId);
    renderJobs();

  } catch (error) {
    console.error('Error deleting job:', error);
    showToast(error.message || 'Error occurred while deleting application.', 'error');
  } finally {
    deleteTargetId = null;
  }
}

// ==========================================================================
// RENDER & DOM MANIPULATION
// ==========================================================================

/**
 * Renders the dashboard statistics and job applications table.
 */
function renderJobs() {
  // 1. Filter jobs based on active tab
  const filteredJobs = activeFilter === 'All' 
    ? jobsState 
    : jobsState.filter(job => job.status === activeFilter);

  // 2. Update stats and counters (stats should show the count based on the filtered results, and overall badge counts)
  updateDashboardStats(filteredJobs);
  
  // Total badge always reflects overall list length
  totalBadge.textContent = jobsState.length;

  // Clear table body
  jobsTbody.innerHTML = '';

  // 3. Check for empty state
  if (filteredJobs.length === 0) {
    document.getElementById('jobs-table').classList.add('hidden');
    emptyState.classList.remove('hidden');
    
    // Update empty state text based on active filter
    const emptyMsgEl = emptyState.querySelector('.empty-state-text');
    if (activeFilter === 'All') {
      emptyMsgEl.textContent = 'No applications yet. Start by adding your first job!';
    } else {
      emptyMsgEl.textContent = `No applications found with status "${activeFilter}".`;
    }
    return;
  }

  document.getElementById('jobs-table').classList.remove('hidden');
  emptyState.classList.add('hidden');

  // 4. Render rows
  filteredJobs.forEach(job => {
    const tr = document.createElement('tr');
    tr.id = `job-row-${job.id}`;

    // Format Link column cell
    let linkCellHtml = '<span class="text-muted">—</span>';
    if (job.job_link) {
      // Shorten link display text
      let linkText = 'View Listing';
      try {
        const url = new URL(job.job_link);
        linkText = url.hostname;
      } catch (e) {
        // Fallback to text
      }
      linkCellHtml = `
        <a href="${escapeHtml(job.job_link)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(linkText)}
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      `;
    }

    // Format date beautifully (e.g. May 30, 2026)
    const formattedDate = formatDateDisplay(job.apply_date);

    tr.innerHTML = `
      <td class="company-cell">${escapeHtml(job.company)}</td>
      <td class="role-cell">${escapeHtml(job.role)}</td>
      <td>
        <span class="status-badge" data-status="${job.status}">${job.status}</span>
      </td>
      <td class="date-cell" data-sort="${job.apply_date}">${formattedDate}</td>
      <td class="link-cell">${linkCellHtml}</td>
      <td class="notes-cell" title="${escapeHtml(job.notes || '')}">
        ${job.notes ? escapeHtml(job.notes) : '<span class="text-muted">—</span>'}
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-icon-edit" onclick="openEditModal(${job.id})" title="Edit Application">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon btn-icon-delete" onclick="openDeleteDialog(${job.id})" title="Delete Application">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;

    jobsTbody.appendChild(tr);
  });
}

/**
 * Calculates and updates dashboard cards for Total, Interview, Offer, Rejected status counts.
 * Uses the supplied array (handles filtered calculations).
 */
function updateDashboardStats(jobsArray) {
  // Count stats
  const total = jobsArray.length;
  const interview = jobsArray.filter(j => j.status === 'Interview').length;
  const offer = jobsArray.filter(j => j.status === 'Offer').length;
  const rejected = jobsArray.filter(j => j.status === 'Rejected').length;

  // Set text values with animation/effects
  animateCounter(statTotalEl, total);
  animateCounter(statInterviewEl, interview);
  animateCounter(statOfferEl, offer);
  animateCounter(statRejectedEl, rejected);
}

// ==========================================================================
// DIALOG & MODAL CONTROLS
// ==========================================================================

/**
 * Open the Edit modal and fill in existing values.
 */
window.openEditModal = function(id) {
  const job = jobsState.find(j => j.id == id);
  if (!job) return;

  document.getElementById('edit-id').value = job.id;
  document.getElementById('edit-company').value = job.company;
  document.getElementById('edit-role').value = job.role;
  document.getElementById('edit-apply_date').value = job.apply_date;
  document.getElementById('edit-status').value = job.status;
  document.getElementById('edit-job_link').value = job.job_link || '';
  document.getElementById('edit-notes').value = job.notes || '';

  editModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Stop background scrolling
};

function hideEditModal() {
  editModal.classList.add('hidden');
  document.body.style.overflow = '';
  editForm.reset();
}

/**
 * Open custom Delete confirmation dialog.
 */
window.openDeleteDialog = function(id) {
  deleteTargetId = id;
  deleteDialog.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};

function hideDeleteDialog() {
  deleteDialog.classList.add('hidden');
  document.body.style.overflow = '';
  deleteTargetId = null;
}

// ==========================================================================
// UTILITY FUNCTIONS
// ==========================================================================

/**
 * Creates, stacks, and shows a floating toast notification.
 */
function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // SVG Icons
  const successIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const errorIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  const icon = type === 'success' ? successIcon : errorIcon;

  toast.innerHTML = `
    ${icon}
    <span>${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);

  // Auto dismiss after 3 seconds + animation buffers (CSS animation is 3s total)
  setTimeout(() => {
    toast.remove();
  }, 3100);
}

/**
 * Escapes HTML characters to prevent XSS.
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats a YYYY-MM-DD string into a clean UI date (e.g. May 30, 2026)
 */
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  // Format by hand to avoid local timezone conversions from new Date()
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  return `${monthNames[monthIdx]} ${day}, ${year}`;
}

/**
 * Toggles a spinner inside buttons while submits are running.
 */
function toggleLoadingSpinner(buttonEl, show) {
  const textEl = buttonEl.querySelector('.btn-text');
  const spinnerEl = buttonEl.querySelector('.spinner');

  if (show) {
    buttonEl.disabled = true;
    textEl.style.opacity = '0.3';
    spinnerEl.classList.remove('hidden');
  } else {
    buttonEl.disabled = false;
    textEl.style.opacity = '1';
    spinnerEl.classList.add('hidden');
  }
}

/**
 * Animates counting numbers for stats dashboard.
 */
function animateCounter(element, targetValue) {
  const duration = 400; // ms
  const startValue = parseInt(element.textContent, 10) || 0;
  if (startValue === targetValue) {
    element.textContent = targetValue;
    return;
  }
  
  const startTime = performance.now();

  function updateCount(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function: easeOutQuad
    const easeProgress = progress * (2 - progress);
    
    const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);
    element.textContent = currentValue;

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      element.textContent = targetValue;
    }
  }

  requestAnimationFrame(updateCount);
}
