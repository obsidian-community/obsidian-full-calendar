import { Calendar } from "./Calendar";

export default abstract class RemoteCalendar extends Calendar {
    abstract revalidate(): Promise<void>;
}
