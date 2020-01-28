import { CalendarOutlined, QuestionCircleOutlined, YoutubeOutlined } from '@ant-design/icons';
import { Table, Tag, Row, Tooltip, Button, Typography, Select } from 'antd';
import { Header, withSession, GithubUserLink } from 'components';
import { dateRenderer } from 'components/Table';
import withCourseData from 'components/withCourseData';
import * as React from 'react';
import { CourseEvent, CourseService, CourseTask } from 'services/course';
import { CoursePageProps } from 'services/models';
import css from 'styled-jsx/css';
import moment from 'moment-timezone';
import { DEFAULT_TIMEZONE, TIMEZONES } from '../../configs/timezones';

const { Text } = Typography;

type Props = CoursePageProps;

interface State {
  data: CourseEvent[];
  timeZone: string;
}

enum EventTypeColor {
  deadline = 'red',
  test = '#63ab91',
  jstask = 'green',
  htmltask = 'green',
  htmlcssacademy = 'green',
  externaltask = 'green',
  codewars = 'green',
  codejam = 'green',
  newtask = 'green',
  lecture = 'blue',
  lecture_online = 'blue',
  lecture_offline = 'blue',
  lecture_mixed = 'blue',
  lecture_self_study = 'blue',
  info = '#ff7b00',
  warmup = '#63ab91',
  meetup = '#bde04a',
  workshop = '#bde04a',
  interview = '#63ab91',
}

const TaskTypes = {
  deadline: 'deadline',
  test: 'test',
  newtask: 'newtask',
  lecture: 'lecture',
};

const EventTypeToName = {
  lecture_online: 'online lecture',
  lecture_offline: 'offline lecture',
  lecture_mixed: 'mixed lecture',
  lecture_self_study: 'self study',
  warmup: 'warm-up',
  jstask: 'js task',
  htmltask: 'html task',
  codejam: 'code jam',
  externaltask: 'external task',
  htmlcssacademy: 'html/css academy',
  codewars: 'codewars',
};

class SchedulePage extends React.Component<Props, State> {
  state: State = {
    data: [],
    timeZone: DEFAULT_TIMEZONE,
  };

  startOfToday = moment().startOf('day');

  readonly eventTypeToName = EventTypeToName;
  private courseService: CourseService;

  private createCourseEventFromTask(task: CourseTask, type: string): CourseEvent {
    return {
      id: task.id,
      dateTime: task.studentStartDate || '',
      event: {
        type: type,
        name: task.name,
        descriptionUrl: task.descriptionUrl,
      },
      organizer: {
        githubId: task.taskOwner ? task.taskOwner.githubId : '',
      },
    } as CourseEvent;
  }

  constructor(props: Props) {
    super(props);
    this.courseService = new CourseService(props.course.id);
  }

  handleTimeZoneChange = (timeZone: string) => {
    this.setState({ timeZone });
  };

  timeZoneRenderer = (value: string) => {
    return value
      ? moment(value, 'YYYY-MM-DD HH:mmZ')
          .tz(this.state.timeZone)
          .format('HH:mm')
      : '';
  };

  async componentDidMount() {
    const [events, tasks] = await Promise.all([
      this.courseService.getCourseEvents(),
      this.courseService.getCourseTasks(),
    ]);
    const data = events
      .concat(
        tasks.reduce((acc: Array<CourseEvent>, task: CourseTask) => {
          if (task.type !== TaskTypes.test) {
            acc.push(this.createCourseEventFromTask(task, task.type));
          }
          acc.push(
            this.createCourseEventFromTask(task, task.type === TaskTypes.test ? TaskTypes.test : TaskTypes.deadline),
          );
          return acc;
        }, []),
      )
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    this.setState({ data });
  }

  render() {
    return (
      <div>
        <Header title="Schedule" username={this.props.session.githubId} />
        <Row
          style={{
            display: 'flex',
            flexFlow: 'row',
            justifyContent: 'center',
            alignItems: 'baseline',
            textAlign: 'center',
          }}
        >
          <p>
            <Text type="danger">This is a draft version!</Text>
          </p>
          <p>Please see the actual schedule here:</p>
          <Button
            style={{ marginLeft: '10px' }}
            type="primary"
            icon={<CalendarOutlined />}
            target="_blank"
            href="https://docs.google.com/spreadsheets/d/1oM2O8DtjC0HodB3j7hcIResaWBw8P18tXkOl1ymelvE/edit#gid=1509181302"
          >
            See Schedule
          </Button>
        </Row>
        <Row justify="space-between">
          <Select
            className="mt-3 ml-3"
            placeholder="Please select a timezone"
            defaultValue={this.state.timeZone}
            onChange={this.handleTimeZoneChange}
          >
            {Object.entries(TIMEZONES).map(tz => (
              <Select.Option key={tz[0]} value={tz[0]}>
                {tz[0]}
              </Select.Option>
            ))}
          </Select>
          <Button icon={<CalendarOutlined />} href={`/api/course/${this.props.course.id}/events/ical`}>
            Events iCal
          </Button>
        </Row>
        <Table
          rowKey={record => (record.event.type === TaskTypes.deadline ? `${record.id}d` : record.id).toString()}
          pagination={{ pageSize: 100 }}
          size="small"
          dataSource={this.state.data}
          rowClassName={record => (moment(record.dateTime).isBefore(this.startOfToday) ? 'rs-table-row-disabled' : '')}
          columns={[
            { title: 'Date', width: 120, dataIndex: 'dateTime', render: dateRenderer },
            { title: 'Time', width: 60, dataIndex: 'dateTime', render: this.timeZoneRenderer },
            {
              title: 'Type',
              width: 100,
              dataIndex: ['event', 'type'],
              render: (value: keyof typeof EventTypeColor) => (
                <Tag color={EventTypeColor[value]}>
                  {(this.eventTypeToName as Record<string, string>)[value] || value}
                </Tag>
              ),
            },
            {
              title: 'Place',
              dataIndex: 'place',
              render: (value: string) => {
                return value === 'Youtube Live' ? (
                  <div>
                    <YoutubeOutlined /> {value}{' '}
                    <Tooltip title="Ссылка будет в Discord">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </div>
                ) : (
                  value
                );
              },
            },
            {
              title: 'Name',
              dataIndex: ['event', 'name'],
              render: (value: string, record) => {
                return record.event.descriptionUrl ? (
                  <a target="_blank" href={record.event.descriptionUrl}>
                    {value}
                  </a>
                ) : (
                  value
                );
              },
            },
            {
              title: 'Broadcast Url',
              width: 140,
              dataIndex: 'broadcastUrl',
              render: (url: string) =>
                url ? (
                  <a target="_blank" href={url}>
                    Link
                  </a>
                ) : (
                  ''
                ),
            },
            {
              title: 'Organizer',
              width: 140,
              dataIndex: ['organizer', 'githubId'],
              render: (value: string) => (value ? <GithubUserLink value={value} /> : ''),
            },
            {
              title: 'Details Url',
              dataIndex: 'detailsUrl',
              render: (url: string) =>
                url ? (
                  <a target="_blank" href={url}>
                    Details
                  </a>
                ) : (
                  ''
                ),
            },
            { title: 'Comment', dataIndex: 'comment' },
          ]}
        />
        <style jsx>{styles}</style>
      </div>
    );
  }
}

const styles = css`
  :global(.rs-table-row-disabled) {
    opacity: 0.5;
  }
`;

export default withCourseData(withSession(SchedulePage));
