document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const session =
            await requireAuth();

        if (!session) {
            return;
        }


        renderShell({
            active: "Dashboard"
        });


        await loadUserProfile();


        bindDashboardEvents();


        await loadDashboard();


    }
);


/* =========================================================
   DASHBOARD DATA
   ========================================================= */

const dashboardData = {

    jobs: [],

    applicants: [],

    applications: [],

    screenings: [],

    interviews: [],

    hiring: []

};


/* =========================================================
   DASHBOARD EVENTS
   ========================================================= */

function bindDashboardEvents() {

    const refreshButton =
        document.getElementById(
            "refreshDashboard"
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async () => {

                await loadDashboard();

            }
        );

    }

}


/* =========================================================
   LOAD DASHBOARD
   ========================================================= */

async function loadDashboard() {

    try {

        const supabase =
            window.rmsSupabase ||
            window.supabaseClient;


        if (!supabase) {

            throw new Error(
                "Supabase client is not initialized."
            );

        }


        setDashboardLoading();


        /* =================================================
           JOB POSTINGS
           ================================================= */

        const jobsResult =
            await supabase
                .from("job_postings")
                .select(`
                    job_id,
                    job_code,
                    job_title,
                    department,
                    vacancies,
                    status,
                    posting_date,
                    closing_date
                `)
                .order(
                    "posting_date",
                    {
                        ascending: false
                    }
                );


        if (jobsResult.error) {

            throw new Error(
                "Job postings: " +
                jobsResult.error.message
            );

        }


        dashboardData.jobs =
            jobsResult.data || [];


        /* =================================================
           APPLICANTS
           ================================================= */

        const applicantsResult =
            await supabase
                .from("applicants")
                .select(`
                    applicant_id,
                    applicant_no,
                    first_name,
                    last_name,
                    status
                `);


        if (applicantsResult.error) {

            throw new Error(
                "Applicants: " +
                applicantsResult.error.message
            );

        }


        dashboardData.applicants =
            applicantsResult.data || [];


        /* =================================================
           APPLICATIONS
           ================================================= */

        const applicationsResult =
            await supabase
                .from("applications")
                .select(`
                    application_id,
                    applicant_id,
                    job_id,
                    application_date,
                    status,
                    applicants (
                        applicant_id,
                        applicant_no,
                        first_name,
                        last_name
                    ),
                    job_postings (
                        job_id,
                        job_code,
                        job_title,
                        department
                    )
                `)
                .order(
                    "application_date",
                    {
                        ascending: false
                    }
                );


        if (applicationsResult.error) {

            throw new Error(
                "Applications: " +
                applicationsResult.error.message
            );

        }


        dashboardData.applications =
            applicationsResult.data || [];


        /* =================================================
           SCREENINGS
           ================================================= */

        const screeningsResult =
            await supabase
                .from("screenings")
                .select(`
                    screening_id,
                    application_id,
                    screening_date,
                    score,
                    result
                `);


        if (screeningsResult.error) {

            throw new Error(
                "Screenings: " +
                screeningsResult.error.message
            );

        }


        dashboardData.screenings =
            screeningsResult.data || [];


        /* =================================================
           INTERVIEWS
           ================================================= */

        const interviewsResult =
            await supabase
                .from("interviews")
                .select(`
                    interview_id,
                    application_id,
                    interview_date,
                    interview_time,
                    status,
                    score,
                    result
                `);


        if (interviewsResult.error) {

            throw new Error(
                "Interviews: " +
                interviewsResult.error.message
            );

        }


        dashboardData.interviews =
            interviewsResult.data || [];


        /* =================================================
           HIRING
           ================================================= */

        const hiringResult =
            await supabase
                .from("hiring")
                .select(`
                    hiring_id,
                    application_id,
                    hiring_date,
                    position,
                    employment_status,
                    start_date,
                    status
                `);


        if (hiringResult.error) {

            throw new Error(
                "Hiring: " +
                hiringResult.error.message
            );

        }


        dashboardData.hiring =
            hiringResult.data || [];


        /* =================================================
           RENDER
           ================================================= */

        renderDashboardSummary();

        renderRecruitmentPipeline();

        renderApplicantsPerJob();

        renderApplicantsByStatus();

        renderHiresByMonth();

        renderVacanciesByDepartment();

        renderScreeningResults();

        renderInterviewResults();

        renderRecentApplications();


        const updated =
            document.getElementById(
                "dashboardUpdated"
            );


        if (updated) {

            updated.textContent =
                "Updated " +
                new Date().toLocaleString(
                    "en-US",
                    {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                    }
                );

        }


        if (typeof showToast === "function") {

            showToast(
                "Recruitment dashboard loaded successfully.",
                "success"
            );

        }


    } catch (error) {

        console.error(
            "Dashboard Error:",
            error
        );


        renderDashboardError(
            error.message ||
            "Unable to load dashboard."
        );


        if (typeof showToast === "function") {

            showToast(
                error.message ||
                "Unable to load dashboard.",
                "error"
            );

        }

    }

}


/* =========================================================
   SUMMARY
   ========================================================= */

function renderDashboardSummary() {

    const jobs =
        dashboardData.jobs;


    const applicants =
        dashboardData.applicants;


    const applications =
        dashboardData.applications;


    const hiring =
        dashboardData.hiring;


    const openJobs =
        jobs.filter(
            job =>
                normalize(
                    job.status
                ) === "OPEN"
        );


    const forInterview =
        uniqueApplicationCount(
            applications.filter(
                application =>
                    [
                        "FOR INTERVIEW",
                        "INTERVIEW",
                        "INTERVIEWED"
                    ].includes(
                        normalize(
                            application.status
                        )
                    )
            )
        );


    const hired =
        uniqueApplicationCount(
            applications.filter(
                application =>
                    normalize(
                        application.status
                    ) === "HIRED"
            )
        );


    setText(
        "dashboardOpenJobs",
        openJobs.length
    );


    setText(
        "dashboardApplicants",
        applicants.length
    );


    setText(
        "dashboardForInterview",
        forInterview
    );


    setText(
        "dashboardHired",
        hired
    );

}


/* =========================================================
   RECRUITMENT PIPELINE
   ========================================================= */

function renderRecruitmentPipeline() {

    const container =
        document.getElementById(
            "dashboardPipeline"
        );


    if (!container) {
        return;
    }


    const applications =
        dashboardData.applications;


    const screenings =
        dashboardData.screenings;


    const interviews =
        dashboardData.interviews;


    const screenedIds =
        new Set(
            screenings
                .map(
                    row =>
                        String(
                            row.application_id
                        )
                )
        );


    const interviewedIds =
        new Set(
            interviews
                .map(
                    row =>
                        String(
                            row.application_id
                        )
                )
        );


    const qualifiedIds =
        new Set(
            applications
                .filter(
                    row =>
                        normalize(
                            row.status
                        ) === "QUALIFIED"
                )
                .map(
                    row =>
                        String(
                            row.application_id
                        )
                )
        );


    const selectedIds =
        new Set(
            applications
                .filter(
                    row =>
                        normalize(
                            row.status
                        ) ===
                        "SELECTED FOR HIRING"
                )
                .map(
                    row =>
                        String(
                            row.application_id
                        )
                )
        );


    const hiredIds =
        new Set(
            applications
                .filter(
                    row =>
                        normalize(
                            row.status
                        ) === "HIRED"
                )
                .map(
                    row =>
                        String(
                            row.application_id
                        )
                )
        );


    const stages = [

        {
            number: "01",
            label: "Applications",
            value: applications.length
        },

        {
            number: "02",
            label: "Screened",
            value: screenedIds.size
        },

        {
            number: "03",
            label: "Qualified",
            value: qualifiedIds.size
        },

        {
            number: "04",
            label: "Interviewed",
            value: interviewedIds.size
        },

        {
            number: "05",
            label: "Selected",
            value: selectedIds.size
        },

        {
            number: "06",
            label: "Hired",
            value: hiredIds.size
        }

    ];


    container.innerHTML =
        stages
            .map(
                stage => `

                    <div
                        class="dashboard-pipeline-item"
                    >

                        <span
                            class="dashboard-pipeline-number"
                        >
                            ${stage.number}
                        </span>

                        <span
                            class="dashboard-pipeline-label"
                        >
                            ${escapeHtml(
                                stage.label
                            )}
                        </span>

                        <strong
                            class="dashboard-pipeline-value"
                        >
                            ${stage.value}
                        </strong>

                    </div>

                `
            )
            .join("");

}


/* =========================================================
   APPLICANTS PER JOB
   ========================================================= */

function renderApplicantsPerJob() {

    const container =
        document.getElementById(
            "applicantsPerJob"
        );


    if (!container) {
        return;
    }


    const jobs =
        dashboardData.jobs;


    const applications =
        dashboardData.applications;


    const rows =
        jobs.map(
            job => {

                const count =
                    uniqueApplicationCount(
                        applications.filter(
                            application =>
                                String(
                                    application.job_id
                                ) ===
                                String(
                                    job.job_id
                                )
                        )
                    );


                return {

                    label:
                        job.job_title ||
                        job.job_code ||
                        "Unknown",

                    value:
                        count

                };

            }
        )
        .sort(
            (a, b) =>
                b.value - a.value
        );


    renderBarList(
        container,
        rows,
        "No job posting data available."
    );

}


/* =========================================================
   APPLICANTS BY STATUS
   ========================================================= */

function renderApplicantsByStatus() {

    const container =
        document.getElementById(
            "applicantsByStatus"
        );


    if (!container) {
        return;
    }


    const applications =
        dashboardData.applications;


    const counts = {};


    applications.forEach(
        application => {

            const status =
                formatStatus(
                    application.status
                );


            counts[status] =
                (
                    counts[status] ||
                    0
                ) + 1;

        }
    );


    const rows =
        Object.entries(
            counts
        )
        .map(
            ([label, value]) => ({
                label,
                value
            })
        )
        .sort(
            (a, b) =>
                b.value - a.value
        );


    renderBarList(
        container,
        rows,
        "No application status data available."
    );

}


/* =========================================================
   HIRES BY MONTH
   ========================================================= */

function renderHiresByMonth() {

    const container =
        document.getElementById(
            "hiresByMonth"
        );


    if (!container) {
        return;
    }


    const hiring =
        dashboardData.hiring;


    const applications =
        dashboardData.applications;


    const monthCounts = {};


    hiring
        .filter(
            record =>
                normalize(
                    record.status
                ) === "HIRED" ||
                !record.status
        )
        .forEach(
            record => {

                if (!record.hiring_date) {
                    return;
                }


                const date =
                    new Date(
                        record.hiring_date
                    );


                if (
                    Number.isNaN(
                        date.getTime()
                    )
                ) {
                    return;
                }


                const key =
                    date.toLocaleDateString(
                        "en-US",
                        {
                            month: "short",
                            year: "numeric"
                        }
                    );


                monthCounts[key] =
                    (
                        monthCounts[key] ||
                        0
                    ) + 1;

            }
        );


    if (
        Object.keys(
            monthCounts
        ).length === 0
    ) {

        applications
            .filter(
                application =>
                    normalize(
                        application.status
                    ) === "HIRED"
            )
            .forEach(
                application => {

                    if (
                        !application.application_date
                    ) {
                        return;
                    }


                    const date =
                        new Date(
                            application.application_date
                        );


                    if (
                        Number.isNaN(
                            date.getTime()
                        )
                    ) {
                        return;
                    }


                    const key =
                        date.toLocaleDateString(
                            "en-US",
                            {
                                month: "short",
                                year: "numeric"
                            }
                        );


                    monthCounts[key] =
                        (
                            monthCounts[key] ||
                            0
                        ) + 1;

                }
            );

    }


    const rows =
        Object.entries(
            monthCounts
        )
        .map(
            ([label, value]) => ({
                label,
                value
            })
        )
        .sort(
            (a, b) =>
                monthSortValue(
                    a.label
                ) -
                monthSortValue(
                    b.label
                )
        );


    renderBarList(
        container,
        rows,
        "No hiring records available."
    );

}


/* =========================================================
   VACANCIES BY DEPARTMENT
   ========================================================= */

function renderVacanciesByDepartment() {

    const container =
        document.getElementById(
            "vacanciesByDepartment"
        );


    if (!container) {
        return;
    }


    const jobs =
        dashboardData.jobs;


    const departmentCounts = {};


    jobs.forEach(
        job => {

            const department =
                String(
                    job.department ||
                    "Unassigned"
                ).trim();


            const vacancies =
                Number(
                    job.vacancies
                ) || 0;


            departmentCounts[
                department
            ] =
                (
                    departmentCounts[
                        department
                    ] ||
                    0
                ) +
                vacancies;

        }
    );


    const rows =
        Object.entries(
            departmentCounts
        )
        .map(
            ([label, value]) => ({
                label,
                value
            })
        )
        .sort(
            (a, b) =>
                b.value - a.value
        );


    renderBarList(
        container,
        rows,
        "No vacancy data available."
    );

}


/* =========================================================
   SCREENING RESULTS
   ========================================================= */

function renderScreeningResults() {

    const container =
        document.getElementById(
            "screeningResults"
        );


    if (!container) {
        return;
    }


    const screenings =
        dashboardData.screenings;


    const counts = {};


    screenings.forEach(
        screening => {

            const result =
                formatStatus(
                    screening.result ||
                    "Not Recorded"
                );


            counts[result] =
                (
                    counts[result] ||
                    0
                ) + 1;

        }
    );


    const rows =
        Object.entries(
            counts
        )
        .map(
            ([label, value]) => ({
                label,
                value
            })
        )
        .sort(
            (a, b) =>
                b.value - a.value
        );


    renderBarList(
        container,
        rows,
        "No screening results available."
    );

}


/* =========================================================
   INTERVIEW RESULTS
   ========================================================= */

function renderInterviewResults() {

    const container =
        document.getElementById(
            "interviewResults"
        );


    if (!container) {
        return;
    }


    const interviews =
        dashboardData.interviews;


    const counts = {};


    interviews.forEach(
        interview => {

            const result =
                formatStatus(
                    interview.result ||
                    interview.status ||
                    "Not Recorded"
                );


            counts[result] =
                (
                    counts[result] ||
                    0
                ) + 1;

        }
    );


    const rows =
        Object.entries(
            counts
        )
        .map(
            ([label, value]) => ({
                label,
                value
            })
        )
        .sort(
            (a, b) =>
                b.value - a.value
        );


    renderBarList(
        container,
        rows,
        "No interview results available."
    );

}


/* =========================================================
   RECENT APPLICATIONS
   ========================================================= */

function renderRecentApplications() {

    const container =
        document.getElementById(
            "recentApplications"
        );


    if (!container) {
        return;
    }


    const rows =
        dashboardData
            .applications
            .slice(0, 7);


    if (!rows.length) {

        container.innerHTML = `

            <tr>

                <td
                    colspan="4"
                    class="dashboard-empty"
                >
                    No applications found yet.
                </td>

            </tr>

        `;

        return;

    }


    container.innerHTML =
        rows
            .map(
                row => {

                    const applicant =
                        row.applicants;


                    const applicantName =
                        [
                            applicant?.first_name,
                            applicant?.last_name
                        ]
                            .filter(Boolean)
                            .join(" ")
                            .trim();


                    const job =
                        row.job_postings;


                    return `

                        <tr>

                            <td>

                                <strong>
                                    ${escapeHtml(
                                        applicantName ||
                                        "Unknown"
                                    )}
                                </strong>

                            </td>

                            <td>

                                ${escapeHtml(
                                    job?.job_title ||
                                    "—"
                                )}

                            </td>

                            <td>

                                ${formatDate(
                                    row.application_date
                                )}

                            </td>

                            <td>

                                ${statusBadge(
                                    row.status
                                )}

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   BAR LIST
   ========================================================= */

function renderBarList(
    container,
    rows,
    emptyMessage
) {

    if (!rows.length) {

        container.innerHTML = `

            <div
                class="dashboard-empty"
            >
                ${escapeHtml(
                    emptyMessage
                )}
            </div>

        `;

        return;

    }


    const max =
        Math.max(
            ...rows.map(
                row =>
                    Number(
                        row.value
                    ) || 0
            ),
            1
        );


    container.innerHTML =
        rows
            .map(
                row => {

                    const value =
                        Number(
                            row.value
                        ) || 0;


                    const width =
                        Math.max(
                            value /
                            max *
                            100,
                            value > 0
                                ? 3
                                : 0
                        );


                    return `

                        <div
                            class="dashboard-bar-row"
                        >

                            <span
                                class="dashboard-bar-label"
                                title="${escapeHtml(
                                    row.label
                                )}"
                            >
                                ${escapeHtml(
                                    row.label
                                )}
                            </span>

                            <div
                                class="dashboard-bar-track"
                            >

                                <span
                                    class="dashboard-bar-fill"
                                    style="width:${width}%"
                                ></span>

                            </div>

                            <strong
                                class="dashboard-bar-value"
                            >
                                ${value}
                            </strong>

                        </div>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   ERROR STATE
   ========================================================= */

function renderDashboardError(
    message
) {

    const containers = [

        "dashboardPipeline",

        "applicantsPerJob",

        "applicantsByStatus",

        "hiresByMonth",

        "vacanciesByDepartment",

        "screeningResults",

        "interviewResults"

    ];


    containers.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.innerHTML = `

                    <div
                        class="dashboard-empty"
                    >
                        ${escapeHtml(
                            message
                        )}
                    </div>

                `;

            }

        }
    );


    const recent =
        document.getElementById(
            "recentApplications"
        );


    if (recent) {

        recent.innerHTML = `

            <tr>

                <td
                    colspan="4"
                    class="dashboard-empty"
                >
                    ${escapeHtml(
                        message
                    )}
                </td>

            </tr>

        `;

    }

}


/* =========================================================
   LOADING STATE
   ========================================================= */

function setDashboardLoading() {

    const ids = [

        "dashboardOpenJobs",

        "dashboardApplicants",

        "dashboardForInterview",

        "dashboardHired"

    ];


    ids.forEach(
        id =>
            setText(
                id,
                "..."
            )
    );


    const containers = [

        "dashboardPipeline",

        "applicantsPerJob",

        "applicantsByStatus",

        "hiresByMonth",

        "vacanciesByDepartment",

        "screeningResults",

        "interviewResults"

    ];


    containers.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.innerHTML = `

                    <div
                        class="dashboard-loading"
                    >
                        Loading...
                    </div>

                `;

            }

        }
    );

}


/* =========================================================
   HELPERS
   ========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            String(value);

    }

}


function normalize(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toUpperCase()
        .replace(
            /_/g,
            " "
        );

}


function formatStatus(
    value
) {

    const normalized =
        normalize(
            value
        );


    if (!normalized) {
        return "Not Recorded";
    }


    return normalized
        .toLowerCase()
        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );

}


function uniqueApplicationCount(
    applications
) {

    return new Set(
        applications.map(
            application =>
                String(
                    application.application_id
                )
        )
    ).size;

}


function monthSortValue(
    label
) {

    const date =
        new Date(
            "1 " +
            label
        );


    const time =
        date.getTime();


    return Number.isNaN(time)
        ? 0
        : time;

}