import { Button, Modal, Checkbox, Form, Input, Layout, message, Radio, Select, Table } from 'antd';
import { AdminSider, Header, Session, withSession } from 'components';
import { boolRenderer, stringSorter, tagsRenderer } from 'components/Table';
import { union } from 'lodash';
import { useCallback, useState } from 'react';
import { useAsync } from 'react-use';
import { Task, TaskService } from 'services/task';
import { githubRepoUrl, urlPattern } from 'services/validators';

const { Content } = Layout;
type Props = { session: Session };

function Page(props: Props) {
  const [data, setData] = useState([] as Task[]);
  const [modalData, setModalData] = useState(null as Partial<Task> | null);
  const [modalAction, setModalAction] = useState('update');
  const [form] = Form.useForm();
  const service = new TaskService();

  useAsync(async () => {
    const tasks = await service.getTasks();
    setData(tasks);
  }, []);

  const handleAddItem = () => {
    setModalData({});
    setModalAction('create');
  };

  const handleEditItem = (record: Task) => {
    setModalData(record);
    setModalAction('update');
  };

  const handleModalSubmit = useCallback(
    async (values: any) => {
      try {
        const record = createRecord(values);
        const item =
          modalAction === 'update'
            ? await service.updateTask(modalData!.id!, record)
            : await service.createTask(record);
        const updatedData =
          modalAction === 'update' ? data.map(d => (d.id === item.id ? { ...d, ...item } : d)) : data.concat([item]);
        setModalData(null);
        setData(updatedData);
      } catch (e) {
        message.error('An error occurred. Please try again later.');
      }
    },
    [modalData, modalAction],
  );

  const renderModal = useCallback(() => {
    if (modalData == null) {
      return null;
    }
    const isAutoTask = (form.getFieldValue('verification') || modalData?.verification) === 'auto';
    const type = form.getFieldValue('type') || modalData?.type;
    const allTags = union(...data.map(d => d.tags || []));
    return (
      <Modal
        style={{ top: 20 }}
        visible={true}
        title="Stage"
        okText="Save"
        onOk={async e => {
          e.preventDefault();
          const values = await form.validateFields().catch(() => null);
          if (values == null) {
            return;
          }
          handleModalSubmit(values);
        }}
        onCancel={() => {
          setModalData(null);
          form.resetFields();
        }}
      >
        <Form form={form} initialValues={getInitialValues(modalData)} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter stage name' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="tags" label="Tags">
            <Select mode="tags">
              {allTags.map(tag => (
                <Select.Option key={tag} value={tag}>
                  {tag}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="descriptionUrl"
            label="Description URL"
            rules={[
              {
                required: true,
                message: 'Please enter description URL',
              },
              {
                message: 'Please enter valid URL',
                pattern: urlPattern,
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="githubPrRequired" label="Github" valuePropName="checked">
            <Checkbox>Github Pull Request required</Checkbox>
          </Form.Item>
          <Form.Item name="type" label="Task Type" rules={[{ required: true, message: 'Please select a type' }]}>
            <Select>
              <Select.Option value="jstask">JS task</Select.Option>
              <Select.Option value="htmltask">HTML task</Select.Option>
              <Select.Option value="htmlcssacademy">HTML/CSS Academy</Select.Option>
              <Select.Option value="codewars">Codewars</Select.Option>
              <Select.Option value="test">Test</Select.Option>
              <Select.Option value="codejam">Code Jam</Select.Option>
              <Select.Option value="interview">Interview</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="verification" label="Verification">
            <Radio.Group>
              <Radio value="manual">Manual</Radio>
              <Radio value="auto">Auto</Radio>
            </Radio.Group>
          </Form.Item>
          {isAutoTask && (
            <Form.Item name="githubRepoName" label="Expected Github Repo Name">
              <Input />
            </Form.Item>
          )}
          {isAutoTask && type === 'jstask' && (
            <Form.Item
              name="sourceGithubRepoUrl"
              label="Source Github Repo Url"
              rules={[{ required: true, message: 'Please enter Github Repo Url', pattern: githubRepoUrl }]}
            >
              <Input />
            </Form.Item>
          )}
        </Form>
      </Modal>
    );
  }, [modalData, handleModalSubmit]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AdminSider />
      <Layout style={{ background: '#fff' }}>
        <Header title="Manage Tasks" username={props.session.githubId} />
        <Content style={{ margin: 8 }}>
          <Button type="primary" onClick={handleAddItem}>
            Add Task
          </Button>
          <Table
            size="small"
            style={{ marginTop: 8 }}
            dataSource={data}
            pagination={{ pageSize: 100 }}
            rowKey="id"
            columns={getColumns(handleEditItem)}
          />
        </Content>
      </Layout>
      {renderModal()}
    </Layout>
  );
}

function createRecord(values: any) {
  const data: Partial<Task> = {
    type: values.type,
    name: values.name,
    verification: values.verification,
    githubPrRequired: !!values.githubPrRequired,
    descriptionUrl: values.descriptionUrl,
    githubRepoName: values.githubRepoName,
    sourceGithubRepoUrl: values.sourceGithubRepoUrl,
    tags: values.tags,
  };
  return data;
}

function getColumns(handleEditItem: any) {
  return [
    {
      title: 'Id',
      dataIndex: 'id',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      sorter: stringSorter<Task>('name'),
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      render: tagsRenderer,
    },
    {
      title: 'Description URL',
      dataIndex: 'descriptionUrl',
      width: 200,
    },
    {
      title: 'Github PR Required',
      dataIndex: 'githubPrRequired',
      render: boolRenderer,
    },
    {
      title: 'Github Repo Name',
      dataIndex: 'githubRepoName',
    },
    {
      title: 'Verification',
      dataIndex: 'verification',
    },
    {
      title: 'Type',
      dataIndex: 'type',
    },
    {
      title: 'Actions',
      dataIndex: 'actions',
      render: (_: any, record: Task) => <a onClick={() => handleEditItem(record)}>Edit</a>,
    },
  ];
}

function getInitialValues(modalData: Partial<Task>) {
  return {
    ...modalData,
    verification: modalData.verification || 'manual',
  };
}

export default withSession(Page);
