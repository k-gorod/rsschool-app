import * as React from 'react';
import { Select } from 'antd';
import { GithubAvatar } from 'components';
import { get } from 'lodash';

type Person = { id: number; githubId: string; name: string };

type Props = {
  [key: string]: any;
  searchFn: (value: string) => Promise<Person[]>;
  defaultValues?: Person[];
  keyField?: 'id' | 'githubId';
};

type State = {
  data: Person[];
};

export class UserSearch extends React.Component<Props, State> {
  state: State = {
    data: this.props.defaultValues || [],
  };

  handleSearch = async (value: string) => {
    if (value) {
      const data = await this.props.searchFn(value);
      this.setState({ data });
    } else {
      this.setState({ data: this.props.defaultValues || [] });
    }
  };

  componentDidUpdate = (prevProps: Props) => {
    if (prevProps.defaultValues !== this.props.defaultValues) {
      this.setState({ data: this.props.defaultValues || [] });
    }
  };

  render() {
    const { keyField, searchFn, defaultValues, ...props } = this.props;
    return (
      <Select
        {...props}
        showSearch
        defaultValue={undefined}
        defaultActiveFirstOption={false}
        showArrow={defaultValues ? Boolean(defaultValues.length) : false}
        filterOption={false}
        onSearch={this.handleSearch}
        placeholder={defaultValues && defaultValues.length > 0 ? 'Select...' : 'Search...'}
        notFoundContent={null}
      >
        {this.state.data.map(person => (
          <Select.Option key={person.id} value={keyField ? get(person, keyField) : person.id}>
            <GithubAvatar size={24} githubId={person.githubId} /> {person.name} ({person.githubId})
          </Select.Option>
        ))}
      </Select>
    );
  }
}
