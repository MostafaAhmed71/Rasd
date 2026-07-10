import { Outlet, useLocation } from 'react-router-dom'
import { InstructorNav } from '../../components/InstructorNav'
import { Layout } from '../../components/Layout'
import { PageMotion } from '../../components/PageMotion'

export function InstructorLayout() {
  const location = useLocation()

  return (
    <Layout title="لوحة عضو التدريس">
      <InstructorNav />
      <PageMotion key={location.pathname}>
        <Outlet />
      </PageMotion>
    </Layout>
  )
}
