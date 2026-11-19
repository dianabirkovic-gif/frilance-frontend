import type { AccessLevel, AppSection, Role } from "../api/auth";
import type { ClientStage, ClientStatus } from "../api/clients";
import type { PostStatus, PostType } from "../api/contentPlan";
import type { EventTag } from "../api/dashboard";
import type { TargetTaskKind, TargetTaskStatus } from "../api/target";
import type { CampaignPlatform, CampaignStatus, CreativeKind } from "../api/targetAds";
import type { FinanceEntryType, PaymentMethod, PaymentStatus } from "../api/finance";
import type { TeamMemberStatus } from "../api/team";
import type { ChipTone } from "../atoms/Chip/Chip";

export type NavGroupKey = "work" | "business";
export type NavItemKey = "overview" | "clients" | "content" | "target" | "finance" | "reports" | "analytics" | "team" | "mySalary";
export type FilterId = "all" | "active" | "attention" | "archived";
export type ClientDetailTab = "overview" | "content" | "finance" | "files" | "notes";
/** The content plan's three renderings of the same posts — the mockup's view toggle. */
export type ContentPlanView = "week" | "month" | "list";

/**
 * Every user-facing UI string in the app, grouped by the component/page that
 * owns it, plus a few shared namespaces keyed by domain enum so every place
 * needing "the label for enum value X" reads the same entry. `uk`/`en` are
 * checked against this interface, so a missing/extra key in either locale is
 * a compile error.
 */
export interface Dictionary {
  themeToggle: {
    ariaLabel: string;
  };
  localeToggle: {
    ariaLabel: string;
  };
  loginPage: {
    email: string;
    password: string;
    submitIdle: string;
    submitLoading: string;
    genericError: string;
  };
  claimInvitePage: {
    intro: string;
    email: string;
    token: string;
    password: string;
    submitIdle: string;
    submitLoading: string;
    genericError: string;
  };
  dashboardPage: {
    title: string;
    loading: string;
    loadErrorPrefix: string;
    retry: string;
  };
  clientsPage: {
    title: string;
    loading: string;
    loadErrorPrefix: string;
    retry: string;
    newClientButton: string;
    filters: Record<FilterId, string>;
    subtitleTemplate: string;
    /** «Кошик»: deleted clients, recoverable until purged. Owner-only. */
    trash: {
      chip: string;
      subtitleTemplate: string;
      loading: string;
      loadErrorPrefix: string;
      retry: string;
      empty: string;
      hintTemplate: string;
      headers: { client: string; deleted: string; purge: string };
      deletedByTemplate: string;
      purgeInTemplate: string;
      purgeToday: string;
      restore: string;
      restoring: string;
      restoredTemplate: string;
      restoreError: string;
      deleteForever: string;
      purgeError: string;
      purgeConfirmTitle: string;
      purgeConfirmMessageTemplate: string;
      purgeConfirmLabel: string;
      emptyTrash: string;
      emptyConfirmTitle: string;
      emptyConfirmMessageTemplate: string;
      emptyConfirmLabel: string;
    };
  };
  /**
   * Day/month names, shared by everything that draws a date — the content
   * plan's week grid, its month grid and its list all label the same Tuesday.
   */
  calendar: {
    /** Indexed by `Date#getDay` — Sunday first. */
    weekdaysShort: string[];
    /** Indexed by `Date#getDay` — Sunday first. The week grid's column heads. */
    weekdaysLong: string[];
    /** Indexed by month number - 1, for compact date labels. */
    monthsShort: string[];
  };
  contentPlanPage: {
    title: string;
    loading: string;
    loadErrorPrefix: string;
    /** Shown over a partly-loaded range: the days that arrived stay on screen. */
    partialLoadError: string;
    retry: string;
    newPostButton: string;
    subtitleTemplate: string;
    previousPeriod: string;
    nextPeriod: string;
    today: string;
    views: Record<ContentPlanView, string>;
    /** Names the status colour key, for screen readers and tests alike. */
    legendLabel: string;
    clientFilterLabelTemplate: string;
    allClients: string;
    deleteConfirmTitle: string;
    deleteConfirmMessageTemplate: string;
  };
  contentPlanBoard: {
    empty: string;
    /** Prefixes the author's name on a card, e.g. "Автор: Оксана". */
    authorTemplate: string;
    emptyDay: string;
    addOnDay: string;
    todaySuffix: string;
    cycleStatusHint: string;
    deleteAriaLabel: string;
  };
  contentPlanCalendar: {
    empty: string;
    addOnDay: string;
    cycleStatusHint: string;
    deleteAriaLabel: string;
    headers: {
      date: string;
      day: string;
      type: string;
      topic: string;
      author: string;
      status: string;
      rating: string;
    };
  };
  /**
   * Backend failures the user is meant to read, keyed by the error code the
   * API sends. See `apiErrorMessage.ts` — the backend's own message is English
   * and must never reach a user.
   */
  apiError: {
    clientCompleted: string;
    noteTooLong: string;
    dueBeforeIssue: string;
    fileTooLarge: string;
    unsupportedFileType: string;
    invalidCampaignStat: string;
    invalidCampaignPeriod: string;
  };
  /** The post note's formatting toolbar (#24) — icon buttons, so every one needs a name. */
  richTextEditor: {
    toolbarLabel: string;
    bold: string;
    italic: string;
    underline: string;
    bulletList: string;
    orderedList: string;
  };
  postDrawer: {
    createTitle: string;
    editTitle: string;
    close: string;
    genericError: string;
    submitIdle: string;
    submitLoading: string;
    noClients: string;
    /** Why `{name}` is missing from the picker when the page is filtered to it (#23). */
    completedClientNoticeTemplate: string;
    /** Marks a completed client in the picker while editing — `{name}` is its name. */
    completedClientOptionTemplate: string;
    /** Read-only line naming who wrote the post being edited. */
    authorLabel: string;
    unknownAuthor: string;
    fields: {
      client: string;
      title: string;
      type: string;
      date: string;
      status: string;
      note: string;
    };
    /** Sits under the note field: what it is for, in one line. */
    noteHint: string;
  };
  ratingStars: {
    rateTemplate: string;
    currentTemplate: string;
  };
  postStatus: Record<PostStatus, string>;
  /** The same statuses where the room is a chip or a stepper segment, not a table cell. */
  postStatusShort: Record<PostStatus, string>;
  postType: Record<PostType, string>;
  /** The targetologist's task board (the Таргет section). */
  targetKind: Record<TargetTaskKind, string>;
  targetStatus: Record<TargetTaskStatus, string>;
  targetPage: {
    title: string;
    subtitleTemplate: string;
    loading: string;
    loadErrorPrefix: string;
    retry: string;
    allClients: string;
    clientFilterLabelTemplate: string;
    newTaskButton: string;
    emptyColumn: string;
    emptyBoard: string;
    overdueBadge: string;
    dueTemplate: string;
    noDueDate: string;
    advanceTemplate: string;
    edit: string;
    delete: string;
    deleteConfirmTitle: string;
    deleteConfirmMessageTemplate: string;
  };
  targetTabs: {
    label: string;
    tasks: string;
    campaigns: string;
    analytics: string;
    creatives: string;
  };
  campaignPlatform: Record<CampaignPlatform, string>;
  campaignStatus: Record<CampaignStatus, string>;
  /** Advertising figures — used by the campaigns, their stats form and the analysis. */
  metrics: {
    spend: string;
    impressions: string;
    reach: string;
    clicks: string;
    leads: string;
    revenue: string;
    ctr: string;
    cpc: string;
    cpl: string;
    cpm: string;
    roas: string;
    reachNote: string;
  };
  campaignsTab: {
    subtitleTemplate: string;
    loading: string;
    loadErrorPrefix: string;
    retry: string;
    newButton: string;
    empty: string;
    budgetTemplate: string;
    periodTemplate: string;
    periodOpenTemplate: string;
    statDaysTemplate: string;
    noStats: string;
    enterStats: string;
    edit: string;
    delete: string;
    deleteConfirmTitle: string;
    deleteConfirmMessageTemplate: string;
  };
  campaignDrawer: {
    createTitle: string;
    editTitle: string;
    close: string;
    fields: {
      client: string;
      name: string;
      platform: string;
      status: string;
      startDate: string;
      endDate: string;
      budget: string;
    };
    noClients: string;
    completedClientOptionTemplate: string;
    submitIdle: string;
    submitLoading: string;
  };
  statsDrawer: {
    title: string;
    close: string;
    loading: string;
    loadErrorPrefix: string;
    formTitle: string;
    replaceNote: string;
    fields: {
      date: string;
      spend: string;
      impressions: string;
      reach: string;
      clicks: string;
      leads: string;
      revenue: string;
    };
    revenueHint: string;
    save: string;
    saving: string;
    tableTitle: string;
    noRows: string;
    dateColumn: string;
    deleteRow: string;
    deleteRowConfirm: string;
    editRow: string;
  };
  /** «Імпорт CSV» in the campaign statistics drawer: fill many days from an ad cabinet's export. */
  statsImport: {
    button: string;
    title: string;
    hint: string;
    fileLabel: string;
    fileTooLarge: string;
    fileUnreadable: string;
    noTable: string;
    mappingTitle: string;
    mappingHint: string;
    fields: {
      date: string;
      spend: string;
      impressions: string;
      reach: string;
      clicks: string;
      leads: string;
      revenue: string;
    };
    notMapped: string;
    dateFormatLabel: string;
    dateFormatAuto: string;
    dateFormatUs: string;
    campaignFilterLabel: string;
    campaignFilterPlaceholder: string;
    campaignFilterHint: string;
    previewTitle: string;
    summaryTemplate: string;
    skippedTemplate: string;
    problemsTitle: string;
    problemTemplate: string;
    problemsMoreTemplate: string;
    problemReason: {
      number: string;
      negative: string;
      clicksOverImpressions: string;
      reachOverImpressions: string;
    };
    tooMany: string;
    noRows: string;
    cancel: string;
    submitIdle: string;
    submitLoading: string;
    doneTemplate: string;
    close: string;
  };
  analyticsTab: {
    subtitleTemplate: string;
    loading: string;
    loadErrorPrefix: string;
    retry: string;
    periodFrom: string;
    periodTo: string;
    last7: string;
    last30: string;
    last90: string;
    empty: string;
    totalsTitle: string;
    byCampaignTitle: string;
    byPlatformTitle: string;
    dailyTitle: string;
    campaignColumn: string;
    platformColumn: string;
    bestBadge: string;
    bestHint: string;
    dailySpendLabel: string;
    dailyLeadsLabel: string;
  };
  /** «Звіт у PDF» from the Аналітика tab: a document for the client built from the entered statistics. */
  adReport: {
    button: string;
    dialogTitle: string;
    hint: string;
    clientLabel: string;
    clientPlaceholder: string;
    fromLabel: string;
    toLabel: string;
    last30: string;
    lastMonth: string;
    cancel: string;
    submitIdle: string;
    submitLoading: string;
    rangeInvalid: string;
    rangeTooLong: string;
    noData: string;
    loadError: string;
    pdf: {
      title: string;
      periodLabel: string;
      generatedTemplate: string;
      /** The currency as a word: the PDF's font has no ₴ glyph. */
      currency: string;
      sections: { totals: string; insights: string; campaigns: string; platforms: string; daily: string };
      headers: { campaign: string; platform: string; date: string };
      insights: {
        summaryTemplate: string;
        summaryNoLeadsTemplate: string;
        roasTemplate: string;
        bestCampaignTemplate: string;
        bestDayTemplate: string;
        reachNote: string;
      };
    };
  };
  creativesTab: {
    subtitleTemplate: string;
    loading: string;
    loadErrorPrefix: string;
    retry: string;
    uploadButton: string;
    empty: string;
    campaignFilterAll: string;
    noCampaign: string;
    play: string;
    previewLoading: string;
    previewError: string;
    download: string;
    delete: string;
    deleteConfirmTitle: string;
    deleteConfirmMessageTemplate: string;
    kind: Record<CreativeKind, string>;
    uploadedByTemplate: string;
  };
  creativeDrawer: {
    title: string;
    close: string;
    fields: { client: string; campaign: string; name: string; file: string };
    noCampaign: string;
    noClients: string;
    completedClientOptionTemplate: string;
    nameHint: string;
    formatsHint: string;
    tooLargeImage: string;
    tooLargeVideo: string;
    unsupported: string;
    submitIdle: string;
    submitLoading: string;
  };
  targetTaskDrawer: {
    createTitle: string;
    editTitle: string;
    close: string;
    authorLabel: string;
    unknownAuthor: string;
    fields: {
      client: string;
      title: string;
      kind: string;
      dueDate: string;
      status: string;
      description: string;
    };
    descriptionHint: string;
    noClients: string;
    completedClientOptionTemplate: string;
    submitIdle: string;
    submitLoading: string;
  };
  teamPage: {
    title: string;
    loading: string;
    loadErrorPrefix: string;
    retry: string;
    inviteButton: string;
    subtitleTemplate: string;
  };
  teamTable: {
    empty: string;
    headers: {
      member: string;
      role: string;
      load: string;
      clients: string;
      status: string;
    };
    status: Record<TeamMemberStatus, string>;
    accessColumn: string;
    editAccessAction: string;
    revokeAction: string;
    revokeConfirmTitle: string;
    revokeConfirmMessageTemplate: string;
    revokeErrorFallback: string;
  };
  editMemberAccessDrawer: {
    titleTemplate: string;
    close: string;
    intro: string;
    genericError: string;
    submitIdle: string;
    submitLoading: string;
  };
  inviteTeamMemberDrawer: {
    title: string;
    close: string;
    genericError: string;
    submitIdle: string;
    submitLoading: string;
    fields: {
      fullName: string;
      email: string;
      role: string;
    };
    accessTitle: string;
    accessNote: string;
    successTitle: string;
    successIntroTemplate: string;
    linkLabel: string;
    copyButton: string;
    copiedButton: string;
    doneButton: string;
  };
  clientStatus: Record<ClientStatus, string>;
  clientStage: Record<ClientStage, string>;
  role: Record<Role, string>;
  appSection: Record<AppSection, string>;
  accessLevel: Record<AccessLevel, string>;
  chip: {
    tone: Record<ChipTone, string>;
  };
  nav: {
    groups: Record<NavGroupKey, string>;
    items: Record<NavItemKey, string>;
  };
  workspace: {
    modeLabel: string;
    value: string;
  };
  addClientDrawer: {
    title: string;
    /** The same form, opened on an existing client — owner only. */
    editTitle: string;
    editSubmitIdle: string;
    editSubmitLoading: string;
    close: string;
    genericError: string;
    submitIdle: string;
    submitLoading: string;
    fields: {
      name: string;
      niche: string;
      status: string;
      stage: string;
      tariffPlan: string;
      revenue: string;
      startDate: string;
      contactSectionTitle: string;
      contactName: string;
      contactRole: string;
      contactPhone: string;
      contactEmail: string;
    };
  };
  clientDetailDrawer: {
    loading: string;
    /** The client became unreachable while its drawer was open — see ClientsPage. */
    unavailable: string;
    close: string;
    notImplemented: string;
    writeAction: string;
    invoiceAction: string;
    callAriaLabel: string;
    messageAriaLabel: string;
    archiveIdle: string;
    archiving: string;
    archiveDone: string;
    tabs: Record<ClientDetailTab, string>;
    contentEmpty: string;
    financeEmpty: string;
    filesEmpty: string;
    notesLockNote: string;
    notesEmpty: string;
    sectionStage: string;
    statRevenueLabel: string;
    /** A team member's version: their own pay from this client, not the agency's. */
    statRevenueLabelPersonal: string;
    editClient: string;
    statDurationLabel: string;
    sectionContact: string;
    sectionActivity: string;
    activityEmpty: string;
    archiveConfirmTitle: string;
    archiveConfirmMessageTemplate: string;
    archiveErrorFallback: string;
    deleteIdle: string;
    deleteConfirmTitle: string;
    /** Says it goes to the trash, for how long, and where to get it back. Contains {name} and {days}. */
    deleteConfirmMessageTemplate: string;
    deleteConfirmLabel: string;
    deleteErrorFallback: string;
    sectionAssignees: string;
    editAssignees: string;
    saveAssignees: string;
    savingAssignees: string;
    cancelAssignees: string;
    assigneesEmpty: string;
    assigneesErrorFallback: string;
  };
  /** The client drawer's «Нотатки» tab — shared by everyone who can see the client. */
  clientNotesTab: {
    sharedNote: string;
    placeholder: string;
    add: string;
    adding: string;
    empty: string;
    edit: string;
    save: string;
    cancel: string;
    delete: string;
    editedSuffix: string;
    loadError: string;
    retry: string;
    deleteConfirmTitle: string;
    deleteConfirmMessage: string;
    readOnly: string;
  };
  /** The client drawer's «Файли» tab. */
  clientFilesTab: {
    hintTemplate: string;
    upload: string;
    uploading: string;
    empty: string;
    download: string;
    delete: string;
    uploadedByTemplate: string;
    loadError: string;
    retry: string;
    tooLarge: string;
    unsupportedType: string;
    deleteConfirmTitle: string;
    deleteConfirmMessageTemplate: string;
    readOnly: string;
  };
  cooperationTimeline: {
    completedOverride: string;
  };
  /**
   * The client drawer's «Контент-план» tab — owned by `ClientsPage`
   * (`ClientContentPlanTab`), not by the drawer, which only gives it the slot.
   */
  clientContentPlanTab: {
    loading: string;
    loadError: string;
    retry: string;
    /** Scoped to the month on screen — the navigator above it names which. */
    empty: string;
    /** The member's grant on CONTENT is NONE — the plan is somebody else's section. */
    noAccess: string;
    todaySuffix: string;
    /**
     * {name} — who wrote the post. Labelled, like the board card's own
     * `contentPlanBoard.authorTemplate`: the drawer's header renders the
     * client's staffing as a `·`-joined list of member names just above this,
     * so a bare name in a `·`-joined meta line reads as an assignee.
     */
    authorTemplate: string;
    previousMonth: string;
    nextMonth: string;
  };
  assigneeStack: {
    /** The "+2" bubble when the staffing outruns the avatars shown. */
    overflowTemplate: string;
    /** Trails the first name when others are hidden, e.g. "Оксана +2". */
    andMoreTemplate: string;
  };
  /** Shared by the create drawer and the client detail drawer's staffing section. */
  assigneePicker: {
    label: string;
    empty: string;
    hint: string;
  };
  clientTable: {
    empty: string;
    headers: {
      client: string;
      specialist: string;
      status: string;
      nextPost: string;
      revenue: string;
      activity: string;
    };
  };
  attentionList: {
    title: string;
    allLink: string;
    empty: string;
  };
  confirmationDialog: {
    confirmLabel: string;
    cancelLabel: string;
    confirming: string;
  };
  contentPlanStrip: {
    title: string;
    empty: string;
  };
  eventLedger: {
    title: string;
    link: string;
    empty: string;
    headers: {
      time: string;
      who: string;
      action: string;
      type: string;
      amount: string;
    };
    tag: Record<EventTag, string>;
  };
  financePage: {
    title: string;
    loading: string;
    loadErrorPrefix: string;
    retry: string;
    newEntryButton: string;
    /** Under the page title: what the month came to, e.g. "Чистий прибуток ₴87 800". */
    subtitleTemplate: string;
    previousMonth: string;
    nextMonth: string;
    clientFilterLabelTemplate: string;
    allClients: string;
    /** The chip row. `all` is the absence of a type filter, not a value of one. */
    typeFilterAll: string;
    deleteConfirmTitle: string;
    deleteConfirmMessageTemplate: string;
  };
  contentPlanExport: {
    button: string;
    dialogTitle: string;
    hint: string;
    clientLabel: string;
    clientPlaceholder: string;
    fromLabel: string;
    toLabel: string;
    thisMonth: string;
    nextMonth: string;
    includeDraftsTemplate: string;
    cancel: string;
    submitIdle: string;
    submitLoading: string;
    rangeInvalid: string;
    rangeTooLong: string;
    noPosts: string;
    loadError: string;
    /** The document itself — what the client reads. */
    pdf: {
      title: string;
      periodLabel: string;
      summaryTemplate: string;
      generatedTemplate: string;
      headers: { date: string; type: string; publication: string; status: string };
    };
  };
  mySalaryPage: {
    title: string;
    /** Under the title: what the member has received this month, e.g. "Отримано ₴20 000". */
    subtitleTemplate: string;
    loading: string;
    loadErrorPrefix: string;
    retry: string;
    previousMonth: string;
    nextMonth: string;
    paidLabel: string;
    pendingLabel: string;
    privacyNote: string;
    empty: string;
    headers: { payment: string; date: string; method: string; status: string; amount: string };
  };
  financeStatCards: {
    income: string;
    expenses: string;
    netProfit: string;
    taxReserve: string;
    /** Under the tax-reserve bar, e.g. "61% від цільових ₴30 000". */
    taxReserveGoalTemplate: string;
    /** Shown instead when the month has no goal set — there is no bar to explain. */
    taxReserveNoGoal: string;
    /** Screen-reader wording for the month-on-month arrow. */
    deltaUpTemplate: string;
    deltaDownTemplate: string;
    /** The receivable line under the cards, e.g. "₴18 000 прострочено (1 рахунок)". */
    overdueTemplate: string;
  };
  cashFlowChart: {
    title: string;
    incomeLegend: string;
    expensesLegend: string;
    empty: string;
  };
  financeRegister: {
    empty: string;
    /** Marks a row the register carried forward from an earlier month. */
    carriedOverLabel: string;
    overdueBadge: string;
    headers: {
      operation: string;
      date: string;
      method: string;
      status: string;
      amount: string;
    };
  };
  financeEntryDrawer: {
    createTitle: string;
    editTitle: string;
    close: string;
    detailsSection: string;
    paymentStatusSection: string;
    /** Explains why «Прострочено» is not one of the stepper's buttons. */
    overdueNotice: string;
    fields: {
      type: string;
      title: string;
      description: string;
      amount: string;
      client: string;
      counterparty: string;
      recipient: string;
      entryDate: string;
      dueDate: string;
      method: string;
      invoiceNumber: string;
    };
    noClient: string;
    counterpartyHint: string;
    recipientNone: string;
    recipientHint: string;
    dueDateHint: string;
    submitIdle: string;
    submitLoading: string;
    markPaid: string;
    deleteLabel: string;
  };
  financeEntryType: Record<FinanceEntryType, string>;
  /** The two stored states. «Прострочено» is `financeRegister.overdueBadge` — it is not one of these. */
  paymentStatus: Record<PaymentStatus, string>;
  paymentMethod: Record<PaymentMethod, string>;
  financeStrip: {
    title: string;
    /** A team member's version of the panel: their own pay, not the agency's. */
    personalTitle: string;
    personalEmpty: string;
    noAccess: string;
  };
  mobileHeader: {
    searchAriaLabel: string;
    notificationsAriaLabel: string;
  };
  revenueHero: {
    kickerTemplate: string;
    range: Record<"week" | "month" | "year", string>;
    empty: string;
    noAccess: string;
  };
  sidebar: {
    disabledTooltip: string;
  };
  teamWorkload: {
    title: string;
    empty: string;
    clientCountTemplate: string;
  };
  topbar: {
    searchPlaceholder: string;
    notificationsAriaLabel: string;
    settingsAriaLabel: string;
  };
  mobileTabBar: {
    moreTab: string;
    disabledFabTooltip: string;
  };
}
