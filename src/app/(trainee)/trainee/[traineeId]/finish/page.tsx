import { FinishScreen } from './FinishScreen'

interface Props {
  params: Promise<{ traineeId: string }>
  searchParams: Promise<{ sessionId: string; planId?: string }>
}

export default async function FinishPage({ params, searchParams }: Props) {
  const { traineeId } = await params
  const { sessionId } = await searchParams

  return <FinishScreen traineeId={traineeId} sessionId={sessionId} />
}
