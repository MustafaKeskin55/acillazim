import { redirect } from "next/navigation";

type Props = { params: { id: string } };

/** Eski React rotası; Türkçe URL’e yönlendirir. */
export default function DashboardServiceEditRedirectPage({ params }: Props) {
  redirect(`/dashboard/hizmet-alanlari/duzenle/${params.id}`);
}
