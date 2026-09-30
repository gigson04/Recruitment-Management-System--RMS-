const RMS_ROLE_ACCESS = {
    Administrator: [
        "*"
    ],

    "HR Staff": [
        "Applicants",
        "Applications",
        "Screening"
    ],

    "HR Officer": [
        "Applicants",
        "Applications",
        "Screening"
    ],

    Recruiter: [
        "Job Postings",
        "Screening",
        "Interviews"
    ],

    Interviewer: [
        "Interviews"
    ],

    "Hiring Manager": [
        "Hiring"
    ],

    Management: [
        "Dashboard",
        "Reports",
        "Applicant Reports",
        "Recruitment Pipeline"
    ],

    Applicant: [
        "Applicant Portal"
    ]
};


const RMS_PAGE_ACCESS = {
    "dashboard.html": "Dashboard",
    "job-postings.html": "Job Postings",
    "open-positions.html": "Open Positions",
    "applicants.html": "Applicants",
    "applications.html": "Applications",
    "screening.html": "Screening",
    "interviews.html": "Interviews",
    "hiring.html": "Hiring",
    "employees.html": "Employees",
    "reports.html": "Reports",
    "applicant-reports.html": "Applicant Reports",
    "applicant-pipeline.html": "Recruitment Pipeline",
    "recruitment-performance.html": "Recruitment Performance",
    "users.html": "Users"
};


async function getCurrentSession() {

    try {

        if (!window.rmsSupabase) {

            throw new Error(
                "Supabase client is not initialized. Check config.js and supabase.js."
            );

        }


        const result =
            await Promise.race([

                window.rmsSupabase.auth.getSession(),

                new Promise((_, reject) => {

                    setTimeout(() => {

                        reject(
                            new Error(
                                "Supabase authentication timed out."
                            )
                        );

                    }, 8000);

                })

            ]);


        if (result.error) {

            console.error(
                "Session error:",
                result.error
            );

            return null;
        }


        return result.data?.session || null;


    } catch (error) {

        console.error(
            "Session error:",
            error
        );

        return null;
    }
}


async function getCurrentUserProfile() {

    try {

        const session =
            await getCurrentSession();


        if (!session?.user) {
            return null;
        }


        const {
            data,
            error
        } = await window.rmsSupabase
            .from("users")
            .select(`
                user_id,
                username,
                role,
                status,
                created_at
            `)
            .eq(
                "user_id",
                session.user.id
            )
            .maybeSingle();


        if (error) {

            console.error(
                "User profile error:",
                error
            );

            return null;
        }


        return data || null;


    } catch (error) {

        console.error(
            "Unable to load user profile:",
            error
        );

        return null;
    }
}


function normalizeRole(
    role
) {

    return String(
        role || ""
    )
        .trim()
        .toLowerCase();

}


function normalizeAccessLabel(
    label
) {

    return String(
        label || ""
    )
        .trim()
        .toLowerCase();

}


function roleCanAccess(
    role,
    moduleName
) {

    const normalizedRole =
        normalizeRole(role);


    const accessList =
        Object.entries(
            RMS_ROLE_ACCESS
        )
            .find(
                ([roleName]) =>
                    normalizeRole(
                        roleName
                    ) === normalizedRole
            )?.[1];


    if (!accessList) {
        return false;
    }


    if (
        accessList.includes("*")
    ) {

        return true;

    }


    return accessList.some(
        item =>
            normalizeAccessLabel(
                item
            ) ===
            normalizeAccessLabel(
                moduleName
            )
    );

}


function getCurrentPageModule() {

    const fileName =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();


    return (
        RMS_PAGE_ACCESS[
            fileName
        ] || null
    );

}


function applyRoleBasedNavigation(
    profile
) {

    if (!profile) {
        return;
    }


    const role =
        profile.role;


    const links =
        document.querySelectorAll(
            "#appSidebar a"
        );


    links.forEach(
        link => {

            const label =
                link.textContent
                    .trim();


            if (
                !label
            ) {

                return;

            }


            const allowed =
                roleCanAccess(
                    role,
                    label
                );


            if (!allowed) {

                link.style.display =
                    "none";

            } else {

                link.style.display =
                    "";

            }

        }
    );

}


function showRoleAccessDenied(
    moduleName,
    role
) {

    const page =
        document.querySelector(
            ".page-content"
        );


    if (!page) {

        return;

    }


    page.innerHTML = `

        <section
            class="glass-panel section-card"
            style="
                padding:48px;
                text-align:center;
            "
        >

            <div
                style="
                    font-size:48px;
                    margin-bottom:16px;
                "
            >
                🔒
            </div>

            <p
                class="eyebrow"
            >
                ROLE-BASED ACCESS CONTROL
            </p>

            <h2>
                Access Denied
            </h2>

            <p
                style="
                    max-width:560px;
                    margin:12px auto 24px;
                "
            >
                Your account does not have permission
                to access the ${escapeHtml(
                    moduleName
                )} module.
            </p>

            <p
                style="
                    opacity:.65;
                    font-size:13px;
                    margin-bottom:24px;
                "
            >
                Current role:
                <strong>
                    ${escapeHtml(
                        role || "Unknown"
                    )}
                </strong>
            </p>

            <a
                href="dashboard.html"
                class="btn btn-primary"
            >
                Return to Dashboard
            </a>

        </section>

    `;

}


async function requireRole(
    profile,
    moduleName
) {

    if (!profile) {

        window.location.href =
            "login.html";

        return false;
    }


    const allowed =
        roleCanAccess(
            profile.role,
            moduleName
        );


    if (!allowed) {

        console.warn(
            "RBAC denied:",
            {
                role:
                    profile.role,
                module:
                    moduleName
            }
        );


        showRoleAccessDenied(
            moduleName,
            profile.role
        );


        return false;
    }


    return true;

}


async function requireAuth() {

    try {

        if (!window.rmsSupabase) {

            throw new Error(
                "Supabase client is not initialized. Check config.js and supabase.js."
            );

        }


        const session =
            await getCurrentSession();


        if (!session) {

            console.log(
                "No active session."
            );

            window.location.href =
                "login.html";

            return null;
        }


        const profile =
            await getCurrentUserProfile();


        if (!profile) {

            console.error(
                "No user profile found for authenticated account."
            );


            await window.rmsSupabase
                .auth
                .signOut({
                    scope: "local"
                });


            window.location.href =
                "login.html";

            return null;
        }


        if (
            String(
                profile.status || ""
            )
                .trim()
                .toLowerCase() !==
            "active"
        ) {

            console.warn(
                "User account is inactive."
            );


            await window.rmsSupabase
                .auth
                .signOut({
                    scope: "local"
                });


            window.location.href =
                "login.html?error=inactive";

            return null;
        }


        session.userProfile =
            profile;


        applyRoleBasedNavigation(
            profile
        );


        const currentModule =
            getCurrentPageModule();


        if (currentModule) {

            const allowed =
                await requireRole(
                    profile,
                    currentModule
                );


            if (!allowed) {

                return null;

            }

        }


        console.log(
            "Authenticated user:",
            session.user.email
        );


        console.log(
            "Username:",
            profile.username
        );


        console.log(
            "Role:",
            profile.role
        );


        console.log(
            "Status:",
            profile.status
        );


        return session;


    } catch (error) {

        console.error(
            "Authentication error:",
            error
        );


        if (
            window.location.pathname
                .includes("dashboard") ||
            window.location.pathname
                .includes("job-postings") ||
            window.location.pathname
                .includes("open-positions")
        ) {

            alert(
                error.message ||
                "Unable to connect to Supabase."
            );

        }


        return null;
    }
}


async function loginWithPassword(
    email,
    password
) {

    try {

        if (!window.rmsSupabase) {

            throw new Error(
                "Supabase client is not initialized."
            );

        }


        const result =
            await Promise.race([

                window.rmsSupabase
                    .auth
                    .signInWithPassword({
                        email,
                        password
                    }),

                new Promise((_, reject) => {

                    setTimeout(() => {

                        reject(
                            new Error(
                                "Login request timed out. Check your Supabase connection."
                            )
                        );

                    }, 10000);

                })

            ]);


        if (result.error) {

            return result;

        }


        const session =
            result.data?.session;


        if (!session) {

            return {
                data: null,
                error: {
                    message:
                        "Login succeeded but no session was created."
                }
            };

        }


        const {
            data: profile,
            error: profileError
        } = await window.rmsSupabase
            .from("users")
            .select(`
                user_id,
                username,
                role,
                status,
                created_at
            `)
            .eq(
                "user_id",
                session.user.id
            )
            .maybeSingle();


        if (profileError) {

            await window.rmsSupabase
                .auth
                .signOut({
                    scope: "local"
                });


            return {
                data: null,
                error: {
                    message:
                        "Unable to load your user profile."
                }
            };

        }


        if (!profile) {

            await window.rmsSupabase
                .auth
                .signOut({
                    scope: "local"
                });


            return {
                data: null,
                error: {
                    message:
                        "No Recruitment Management System user profile is linked to this account."
                }
            };

        }


        if (
            String(
                profile.status || ""
            )
                .trim()
                .toLowerCase() !==
            "active"
        ) {

            await window.rmsSupabase
                .auth
                .signOut({
                    scope: "local"
                });


            return {
                data: null,
                error: {
                    message:
                        "Your account is inactive. Please contact the administrator."
                }
            };

        }


        return {
            data: {
                session,
                user: session.user,
                profile
            },
            error: null
        };


    } catch (error) {

        console.error(
            "Login exception:",
            error
        );


        return {
            data: null,
            error: {
                message:
                    error.message ||
                    "Unable to connect to Supabase."
            }
        };

    }

}


async function logoutUser() {

    try {

        if (!window.rmsSupabase) {

            throw new Error(
                "Supabase client is not initialized."
            );

        }


        const {
            error
        } = await window.rmsSupabase
            .auth
            .signOut({
                scope: "local"
            });


        if (error) {

            console.error(
                "Logout error:",
                error
            );


            return {
                success: false,
                error
            };

        }


        window.location.href =
            "login.html";


        return {
            success: true
        };


    } catch (error) {

        console.error(
            "Logout exception:",
            error
        );


        return {
            success: false,
            error
        };

    }

}


function watchAuthState(
    callback
) {

    if (!window.rmsSupabase) {

        console.error(
            "Supabase client is not initialized."
        );

        return null;

    }


    return window.rmsSupabase
        .auth
        .onAuthStateChange(
            async (
                event,
                session
            ) => {

                console.log(
                    "Auth state:",
                    event
                );


                if (
                    typeof callback ===
                    "function"
                ) {

                    await callback(
                        event,
                        session
                    );

                }

            }
        );

}


function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}