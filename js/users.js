let usersData = [];
let currentSession = null;
let currentProfile = null;


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        currentSession =
            await requireAuth();

        if (!currentSession) {
            return;
        }


        currentProfile =
            currentSession.userProfile ||
            await getCurrentUserProfile();


        if (!currentProfile) {
            return;
        }


        const role =
            String(
                currentProfile.role || ""
            )
                .trim()
                .toLowerCase();


        if (role !== "administrator") {

            showAccessDenied();

            return;
        }


        setupEvents();

        await loadUsers();

    }
);


function setupEvents() {

    const refreshButton =
        document.getElementById(
            "refreshUsers"
        );


    const searchInput =
        document.getElementById(
            "userSearch"
        );


    const statusFilter =
        document.getElementById(
            "userStatusFilter"
        );


    const roleFilter =
        document.getElementById(
            "userRoleFilter"
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async () => {

                await loadUsers();

            }
        );

    }


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            renderUsers
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            renderUsers
        );

    }


    if (roleFilter) {

        roleFilter.addEventListener(
            "change",
            renderUsers
        );

    }


    const table =
        document.getElementById(
            "usersTable"
        );


    if (table) {

        table.addEventListener(
            "click",
            async event => {

                const button =
                    event.target.closest(
                        "[data-user-action]"
                    );


                if (!button) {
                    return;
                }


                const userId =
                    button.dataset.userId;


                const action =
                    button.dataset.userAction;


                if (!userId || !action) {
                    return;
                }


                await changeUserStatus(
                    userId,
                    action
                );

            }
        );

    }

}


async function loadUsers() {

    const table =
        document.getElementById(
            "usersTable"
        );


    if (table) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="table-empty"
                >
                    Loading users...
                </td>
            </tr>
        `;

    }


    try {

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
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {
            throw error;
        }


        usersData =
            Array.isArray(data)
                ? data
                : [];


        updateSummary();

        updateRoleFilter();

        renderUsers();


    } catch (error) {

        console.error(
            "Unable to load users:",
            error
        );


        usersData = [];

        updateSummary();


        if (table) {

            table.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="table-empty"
                    >
                        Unable to load users.
                    </td>
                </tr>
            `;

        }


        showToast(
            error.message ||
            "Unable to load users.",
            "error"
        );

    }

}


function updateSummary() {

    const total =
        usersData.length;


    const active =
        usersData.filter(
            user =>
                normalizeStatus(
                    user.status
                ) === "ACTIVE"
        ).length;


    const inactive =
        usersData.filter(
            user =>
                normalizeStatus(
                    user.status
                ) === "INACTIVE"
        ).length;


    const administrators =
        usersData.filter(
            user =>
                String(
                    user.role || ""
                )
                    .trim()
                    .toLowerCase() ===
                "administrator"
        ).length;


    setText(
        "totalUsers",
        total
    );

    setText(
        "activeUsers",
        active
    );

    setText(
        "inactiveUsers",
        inactive
    );

    setText(
        "administratorUsers",
        administrators
    );

}


function updateRoleFilter() {

    const select =
        document.getElementById(
            "userRoleFilter"
        );


    if (!select) {
        return;
    }


    const currentValue =
        select.value;


    const roles =
        [
            ...new Set(
                usersData
                    .map(
                        user =>
                            String(
                                user.role || ""
                            ).trim()
                    )
                    .filter(Boolean)
            )
        ]
        .sort(
            (a, b) =>
                a.localeCompare(b)
        );


    select.innerHTML = `
        <option value="ALL">
            All Roles
        </option>
    `;


    roles.forEach(
        role => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                role;

            option.textContent =
                role;

            select.appendChild(
                option
            );

        }
    );


    if (
        roles.includes(
            currentValue
        )
    ) {

        select.value =
            currentValue;

    }

}


function renderUsers() {

    const table =
        document.getElementById(
            "usersTable"
        );


    const count =
        document.getElementById(
            "usersCount"
        );


    if (!table) {
        return;
    }


    const search =
        String(
            document.getElementById(
                "userSearch"
            )?.value || ""
        )
            .trim()
            .toLowerCase();


    const status =
        document.getElementById(
            "userStatusFilter"
        )?.value || "ALL";


    const role =
        document.getElementById(
            "userRoleFilter"
        )?.value || "ALL";


    const filtered =
        usersData.filter(
            user => {

                const username =
                    String(
                        user.username || ""
                    )
                        .toLowerCase();


                const userRole =
                    String(
                        user.role || ""
                    )
                        .trim();


                const userStatus =
                    normalizeStatus(
                        user.status
                    );


                const matchesSearch =
                    !search ||
                    username.includes(
                        search
                    ) ||
                    userRole
                        .toLowerCase()
                        .includes(search);


                const matchesStatus =
                    status === "ALL" ||
                    userStatus ===
                        normalizeStatus(
                            status
                        );


                const matchesRole =
                    role === "ALL" ||
                    userRole === role;


                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesRole
                );

            }
        );


    if (count) {

        count.textContent =
            `${filtered.length} ${
                filtered.length === 1
                    ? "user"
                    : "users"
            }`;

    }


    if (!filtered.length) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="table-empty"
                >
                    No users found.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        filtered
            .map(
                user =>
                    createUserRow(
                        user
                    )
            )
            .join("");

}


function createUserRow(
    user
) {

    const userId =
        escapeHtml(
            user.user_id
        );


    const username =
        escapeHtml(
            user.username ||
            "Unnamed User"
        );


    const role =
        escapeHtml(
            user.role ||
            "No Role"
        );


    const status =
        normalizeStatus(
            user.status
        );


    const isCurrentUser =
        currentSession?.user?.id ===
        user.user_id;


    const created =
        formatUserDate(
            user.created_at
        );


    const statusLabel =
        status === "ACTIVE"
            ? "Active"
            : "Inactive";


    let actionHtml = "";


    if (isCurrentUser) {

        actionHtml = `
            <span class="user-current">
                Current Account
            </span>
        `;

    } else if (status === "ACTIVE") {

        actionHtml = `
            <button
                type="button"
                class="user-action-button deactivate"
                data-user-action="deactivate"
                data-user-id="${userId}"
            >
                Deactivate
            </button>
        `;

    } else {

        actionHtml = `
            <button
                type="button"
                class="user-action-button activate"
                data-user-action="activate"
                data-user-id="${userId}"
            >
                Activate
            </button>
        `;

    }


    return `
        <tr>

            <td>

                <div class="user-name">
                    ${username}
                </div>

            </td>


            <td>

                <div class="user-role">
                    ${role}
                </div>

            </td>


            <td>

                <span
                    class="user-status ${
                        status === "ACTIVE"
                            ? "active"
                            : "inactive"
                    }"
                >
                    ${statusLabel}
                </span>

            </td>


            <td>

                <span class="user-date">
                    ${created}
                </span>

            </td>


            <td>

                <div class="user-actions">
                    ${actionHtml}
                </div>

            </td>

        </tr>
    `;

}


async function changeUserStatus(
    userId,
    action
) {

    if (
        userId ===
        currentSession?.user?.id
    ) {

        showToast(
            "You cannot deactivate your own account.",
            "error"
        );

        return;
    }


    const target =
        usersData.find(
            user =>
                user.user_id ===
                userId
        );


    if (!target) {
        return;
    }


    const newStatus =
        action === "activate"
            ? "Active"
            : "Inactive";


    const username =
        target.username ||
        "this user";


    const confirmed =
        window.confirm(
            action === "activate"
                ? `Activate ${username}?`
                : `Deactivate ${username}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            error
        } = await window.rmsSupabase
            .from("users")
            .update({
                status: newStatus
            })
            .eq(
                "user_id",
                userId
            );


        if (error) {
            throw error;
        }


        showToast(
            action === "activate"
                ? `${username} has been activated.`
                : `${username} has been deactivated.`,
            "success"
        );


        await loadUsers();


    } catch (error) {

        console.error(
            "Unable to change user status:",
            error
        );


        showToast(
            error.message ||
            "Unable to update user status.",
            "error"
        );

    }

}


function showAccessDenied() {

    const page =
        document.querySelector(
            ".page-content"
        );


    if (!page) {
        return;
    }


    page.innerHTML = `
        <div
            class="glass-panel section-card"
            style="padding:40px;text-align:center;"
        >

            <div
                style="font-size:42px;margin-bottom:16px;"
            >
                🔒
            </div>

            <h2>
                Access Denied
            </h2>

            <p>
                Only Administrators can manage system users.
            </p>

            <a
                href="dashboard.html"
                class="btn btn-primary"
            >
                Return to Dashboard
            </a>

        </div>
    `;

}


function normalizeStatus(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toUpperCase();

}


function formatUserDate(
    value
) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";

    }


    return date.toLocaleDateString(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );

}


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
            value;
    }

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


function showToast(
    message,
    type = "info"
) {

    if (
        typeof window.showToast ===
        "function"
    ) {

        window.showToast(
            message,
            type
        );

        return;
    }


    const root =
        document.getElementById(
            "toastRoot"
        );


    if (!root) {
        alert(message);
        return;
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `toast toast-${type}`;


    toast.textContent =
        message;


    root.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.remove();

        },
        3500
    );

}