const Layout = () => import("@/layout/index.vue");

export default {
  path: "/games",
  name: "Games",
  component: Layout,
  redirect: "/games/link-link",
  meta: {
    icon: "ep/goods",
    title: "小游戏",
    rank: 10
  },
  children: [
    {
      path: "/games/link-link",
      name: "LinkLinkGame",
      component: () => import("@/views/games/link-link/index.vue"),
      meta: {
        title: "连连看",
        icon: "ep/grid"
      }
    }
  ]
} satisfies RouteConfigsTable;
