import { FileExcelOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Layout, Popover, Row, Spin, Switch, Table, Typography } from 'antd';
import { GithubAvatar, Header, withSession } from 'components';
import { dateRenderer, getColumnSearchProps, numberSorter, stringSorter } from 'components/Table';
import withCourseData from 'components/withCourseData';
import { useEffect, useMemo, useState } from 'react';
import { CourseService, CourseTask, StudentScore } from 'services/course';
import { CoursePageProps } from 'services/models';
import css from 'styled-jsx/css';

const { Text } = Typography;

export function Page(props: CoursePageProps) {
  const courseService = useMemo(() => new CourseService(props.course.id), []);

  const [loading, setLoading] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [students, setStudents] = useState([] as StudentScore[]);
  const [courseTasks, setCourseTasks] = useState([] as CourseTask[]);

  useEffect(() => {
    setLoading(true);
    Promise.all([courseService.getCourseScore(activeOnly), courseService.getCourseTasks()]).then(
      ([courseScore, courseTasks]) => {
        const sortedTasks = courseTasks.filter(task => !!task.studentEndDate || props.course.completed);

        setLoading(false);
        setStudents(courseScore);
        setCourseTasks(sortedTasks);
      },
    );
  }, []);

  const columns = useMemo(() => getColumns(courseTasks), [courseTasks]);

  const handleActiveOnlyChange = async () => {
    const value = !activeOnly;
    setActiveOnly(value);
    setLoading(true);
    try {
      const courseScore = await courseService.getCourseScore(value);
      setStudents(courseScore);
    } finally {
      setLoading(false);
    }
  };

  const { isAdmin, isHirer, roles, coursesRoles } = props.session;
  const courseId = props.course.id;
  const csvEnabled =
    isAdmin || isHirer || roles[courseId] === 'coursemanager' || coursesRoles?.[courseId]?.includes('manager');
  const columnWidth = 90;
  // where 800 is approximate sum of basic columns (GitHub, Name, etc.)
  const tableWidth = columns.length * columnWidth + 800;
  return (
    <>
      <Header title="Score" username={props.session.githubId} courseName={props.course.name} />
      <Layout.Content style={{ margin: 8 }}>
        <Spin spinning={loading}>
          <Row style={{ margin: '8px 0' }} justify="space-between">
            <div>
              <span style={{ display: 'inline-block', lineHeight: '24px' }}>Active Students Only</span>{' '}
              <Switch checked={activeOnly} onChange={handleActiveOnlyChange} />
            </div>
            <Text mark>Score is refreshed every 5 minutes</Text>
            {csvEnabled && (
              <Button
                icon={<FileExcelOutlined />}
                onClick={() => (window.location.href = `/api/course/${props.course.id}/students/score/csv`)}
              >
                Export CSV
              </Button>
            )}
          </Row>

          <Table<StudentScore>
            className="table-score"
            showHeader
            scroll={{ x: tableWidth, y: 'calc(100vh - 240px)' as any }}
            pagination={{ pageSize: 100 }}
            rowKey="githubId"
            rowClassName={record => (!record.isActive ? 'rs-table-row-disabled' : '')}
            dataSource={students}
            columns={[
              {
                title: '#',
                fixed: 'left',
                dataIndex: 'rank',
                key: 'rank',
                width: 50,
                sorter: numberSorter('rank'),
              },
              {
                title: 'Github',
                fixed: 'left',
                key: 'githubId',
                dataIndex: 'githubId',
                sorter: stringSorter('githubId'),
                width: 150,
                render: (value: string) => (
                  <div>
                    <GithubAvatar githubId={value} size={24} />
                    &nbsp;
                    <a target="_blank" href={`https://github.com/${value}`}>
                      {value}
                    </a>
                  </div>
                ),
                ...getColumnSearchProps('githubId'),
              },
              {
                title: 'Name',
                dataIndex: 'name',
                width: 150,
                sorter: stringSorter('name'),
                render: (value: any, record: StudentScore) => (
                  <a href={`/profile?githubId=${record.githubId}`}>{value}</a>
                ),
                ...getColumnSearchProps('name'),
              },
              {
                title: 'Location',
                dataIndex: 'locationName',
                width: 150,
                sorter: stringSorter('locationName'),
                ...getColumnSearchProps('locationName'),
              },
              {
                title: 'Total',
                dataIndex: 'totalScore',
                width: 80,
                sorter: numberSorter('totalScore'),
                render: value => <Text strong>{value}</Text>,
              },
              ...columns,
              {
                title: 'Mentor',
                dataIndex: ['mentor', 'githubId'],
                width: 150,
                sorter: stringSorter('mentor.githubId' as any),
                render: (value: string) => <a href={`/profile?githubId=${value}`}>{value}</a>,
                ...getColumnSearchProps('mentor.githubId'),
              },
            ]}
          />
        </Spin>
      </Layout.Content>
      <style jsx>{styles}</style>
    </>
  );
}

function getColumns(courseTasks: any[]) {
  const columns = courseTasks.map(task => ({
    dataIndex: task.id.toString(),
    title: () => {
      const icon = (
        <Popover
          content={
            <ul>
              <li>Coefficient: {task.scoreWeight}</li>
              <li>Deadline: {dateRenderer(task.studentEndDate)}</li>
            </ul>
          }
          trigger="click"
        >
          <QuestionCircleOutlined title="Click for detatils" />
        </Popover>
      );
      return task.descriptionUrl ? (
        <>
          <a className="table-header-link" target="_blank" href={task.descriptionUrl}>
            {task.name}
          </a>{' '}
          {icon}
        </>
      ) : (
        <div>
          {task.name} {icon}
        </div>
      );
    },
    width: 100,
    className: 'align-right',
    render: (_: any, d: StudentScore) => {
      const currentTask = d.taskResults.find((taskResult: any) => taskResult.courseTaskId === task.courseTaskId);
      return currentTask ? <div>{currentTask.score}</div> : 0;
    },
  }));
  return columns;
}

const styles = css`
  :global(.rs-table-row-disabled) {
    opacity: 0.25;
  }
  :global(.table-score td, .table-score th) {
    padding: 0 5px !important;
    font-size: 11px;
  }
  :global(.table-score td a) {
    line-height: 24px;
  }
`;

export default withCourseData(withSession(Page));
