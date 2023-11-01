import { useSettings } from '~~/store/settings'

interface RecentFetchOpts {
  initPage?: number
  changeRoute?: boolean
  mode?: 'infinite' | 'page'
}

const defaultOpts = {
  changeRoute: true,
  mode: 'page',
}
export default function (opts: RecentFetchOpts | null = null, q: RecentsQuery | null = null) {
  const cooldownDuration = 300
  const urlroute = useRoute()
  const router = useRouter()
  const config = useAppConfig()
  const defaultQuery: RecentsQuery = config.defaultRecentQuery
  const settings = useSettings()

  // const query = ref<RecentsQuery>(buildQuery())
  let query: Ref<RecentsQuery>
  if (q) {
    query = ref(q)
  }
  else {
    query = useSessionStorage<RecentsQuery>('recent-fetch-query', buildQuery())
    // query = useSessionStorage<RecentsQuery>('recent-fetch-query', { page: opts?.initPage ?? 1 }, { mergeDefaults: opts?.initPage != null })
    if (opts?.initPage != null) {
      query.value.page = opts.initPage
    }
  }

  // if (urlroute.query !== query.value) {
  //   buildURL(query.value, true)
  // }
  const cooldown = ref(false)
  const timeout = ref<NodeJS.Timeout | undefined>(undefined)

  const { data: res, error, pending, refresh } = useFetch<IApiRecents>('/api/showroom/recent', { query, watch: false })
  const pageData = computed(() => {
    return {
      totalCount: res.value?.total_count ?? 1,
      perpage: res.value?.perpage ?? 10,
    }
  })
  const totalPage = computed(() => {
    return res.value?.recents ? Math.ceil(pageData.value.totalCount / pageData.value.perpage) : 1
  })

  /// FUNCTIONS
  watch(
    () => urlroute.query,
    () => onRouteChange(),
  )

  function onRouteChange() {
    changeQuery()
  }

  function queryCheck(object1: RecentsQuery, object2: RecentsQuery) {
    const keys1 = Object.keys(object1) as (keyof RecentsQuery)[]
    const keys2 = Object.keys(object2) as (keyof RecentsQuery)[]
    if (keys1.length !== keys2.length) {
      return false
    }
    for (const key of keys1) {
      if (object1[key] !== object2[key]) {
        return false
      }
    }
    return true
  }

  const queryChange = createEventHook<RecentsQuery | null>()

  function changeQuery(q: RecentsQuery | null = null) {
    if ((opts?.mode ?? defaultOpts.changeRoute) === 'infinite') {
      if (q) {
        const newQuery = Object.assign({}, q)
        const oldQuery = Object.assign({}, query.value)
        delete newQuery.page
        delete oldQuery.page

        if (Object.keys(newQuery).length === Object.keys(oldQuery).length) {
          if (queryCheck(newQuery, oldQuery)) {
            query.value = buildQuery(q)
            refresh()
            return
          }
        }
      }
    }
    query.value = buildQuery(q)
    queryChange.trigger(q)
    refresh()
  }

  function settingQuery(query: { [key: string]: unknown }) {
    if (pending.value || cooldown.value) return
    if (!(opts?.changeRoute ?? defaultOpts.changeRoute)) {
      changeQuery(query)
    }
    else {
      setCooldown(cooldownDuration)
      // buildURL(query)
    }
  }

  function changePage(page: number) {
    if (pending.value || cooldown.value) return
    if (Number.isNaN(page)) page = 1
    settingQuery({ ...query.value, page })
  }

  function buildQuery(query: RecentsQuery | null = null): RecentsQuery {
    const reqQuery = query ?? urlroute.query
    const q: RecentsQuery = { ...defaultQuery }
    for (const key of (Object.keys(reqQuery) as (keyof typeof q)[])) q[key as keyof RecentsQuery] = reqQuery[key] as any
    if (!config.isSort(q.sort)) q.sort = 'date'
    q.page = Number(q.page) ?? 1
    if (q.page < 1) q.page = 1

    if (q.filter !== 'graduated' && q.filter !== 'active') q.filter = 'all'
    q.group = settings.group as Group
    return q
  }

  // function buildURL(_query: RecentsQuery, replace = false) {
  //   const q = { ..._query }
  //   const def = defaultQuery
  //   for (const key of (Object.keys(q) as (keyof typeof q)[])) {
  //     if (q[key] === undefined || q[key] === '' || def[key as keyof RecentsQuery] === q[key]) delete q[key]
  //   }

  //   if (replace) {
  //     router.replace({
  //       path: urlroute.path,
  //       query: { ...q },
  //     })
  //   }
  //   else {
  //     router.push({
  //       path: urlroute.path,
  //       query: { ...q },
  //     })
  //   }
  // }

  function setFilter(q: { [key: string]: unknown }) {
    if (pending.value || cooldown.value) return
    settingQuery({ ...q, page: 1 })
  }

  function setCooldown(ms: number) {
    if (timeout.value) clearTimeout(timeout.value)
    cooldown.value = true
    timeout.value = setTimeout(() => {
      cooldown.value = false
    }, ms)
  }

  return { data: { data: res, query, totalPage, pending, error }, changePage, refresh, setFilter, onQueryChange: queryChange.on }
}
